// The only module that talks to an AI provider. To switch models or providers,
// change this file (or the AI_MODEL / AI_EFFORT environment variables).
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.AI_EFFORT || 'medium';
const MOCK = process.env.MOCK_AI === '1';

/** An error whose message is safe to show to the user, with the HTTP status to send. */
export class AIError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

let client;
const getClient = () => (client ??= new Anthropic()); // reads ANTHROPIC_API_KEY from the environment

const prompts = new Map();
/** Load a system prompt from prompts/<name>.md (cached per server instance). */
export async function loadPrompt(name) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new AIError(`Bad prompt name: ${name}`, 500);
  if (!prompts.has(name)) prompts.set(name, (await readFile(path.join(process.cwd(), 'prompts', `${name}.md`), 'utf8')).trim());
  return prompts.get(name);
}

/**
 * Run one AI request.
 * @param {object} opts
 * @param {string} opts.prompt     name of the system prompt file in prompts/
 * @param {Array}  opts.messages   conversation turns ({ role, content })
 * @param {object} [opts.schema]   JSON schema; when given, the parsed object is returned
 * @param {Function} opts.mock     returns a canned result when MOCK_AI=1 (no API key needed)
 * @param {number} [opts.maxTokens]
 */
export async function generate({ prompt, messages, schema, mock, maxTokens = 16000 }) {
  const system = await loadPrompt(prompt);
  if (MOCK) return mock();

  const params = { model: MODEL, max_tokens: maxTokens, system, messages, output_config: { effort: EFFORT } };
  if (schema) params.output_config.format = { type: 'json_schema', schema };
  // Server-side fallback: if a safety classifier declines, the API retries on another model.
  if (!MODEL.includes('haiku')) Object.assign(params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });

  let res;
  try {
    res = await getClient().beta.messages.create(params);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AIError('The AI API key is missing or invalid on the server.', 500);
    if (err instanceof Anthropic.RateLimitError) throw new AIError('The AI is busy right now. Try again in a minute.', 429);
    if (err instanceof Anthropic.BadRequestError) throw new AIError(`The AI request was rejected: ${err.message}`, 500);
    if (err instanceof Anthropic.APIError) throw new AIError(`The AI service returned an error (${err.status ?? 'network'}).`, 502);
    if (/api ?key|authentication/i.test(String(err?.message))) throw new AIError('ANTHROPIC_API_KEY is not set on the server.', 500);
    throw err;
  }

  if (res.stop_reason === 'refusal') throw new AIError('The AI declined to answer this one. Try rephrasing.', 422);
  if (res.stop_reason === 'max_tokens') throw new AIError('The AI response was too long and got cut off. Try again.', 502);
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  if (!schema) return text;
  try { return JSON.parse(text); } catch { throw new AIError('The AI returned malformed feedback. Try again.', 502); }
}

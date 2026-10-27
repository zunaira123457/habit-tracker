// One entry per AI feature. Each validates its input, builds the user message,
// and calls the shared AI service with that feature's prompt from prompts/.
import { AIError, generate } from './ai-service.js';

const LEVEL_NAMES = { 1: 'a hint toward the pattern', 2: 'an approach outline', 3: 'a full explanation' };
const str = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v, max = 1e6) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(0, Number(v))) : 0);

const RATING = { type: 'string', enum: ['strong', 'okay', 'weak'] };
const rubricItem = { type: 'object', additionalProperties: false, required: ['rating', 'note'], properties: { rating: RATING, note: { type: 'string' } } };
const BEHAVIORAL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['score', 'summary', 'rubric', 'improvements', 'rewrite', 'missingDetails', 'delivery'],
  properties: {
    score: { type: 'integer' },
    summary: { type: 'string' },
    rubric: {
      type: 'object', additionalProperties: false, required: ['star', 'specificity', 'impact', 'results', 'length'],
      properties: { star: rubricItem, specificity: rubricItem, impact: rubricItem, results: rubricItem, length: rubricItem },
    },
    improvements: { type: 'array', items: { type: 'string' } },
    rewrite: { type: 'string' },
    missingDetails: { type: 'array', items: { type: 'string' } },
    delivery: { type: 'object', additionalProperties: false, required: ['fillers', 'pacing'], properties: { fillers: { type: 'string' }, pacing: { type: 'string' } } },
  },
};
const fmtSec = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export const features = {
  /** NeetCode problem help, strictly in order: level 1 → 2 → 3. */
  async 'neetcode-hint'(input) {
    const p = input.problem || {};
    const level = Number(input.level);
    const previous = Array.isArray(input.previousHints) ? input.previousHints.map(h => str(h)) : [];
    if (!p.title || !p.slug) throw new AIError('Missing problem details.', 400);
    if (![1, 2, 3].includes(level)) throw new AIError('Hint level must be 1, 2 or 3.', 400);
    if (previous.length < level - 1) throw new AIError('Ask for the earlier hint levels first.', 400);

    const lines = [
      `Problem: ${str(p.title, 200)} (LeetCode: ${str(p.slug, 200)})`,
      `Difficulty: ${str(p.difficulty, 20)} · NeetCode category: ${str(p.category, 60)}`,
      `Requested: level ${level}, ${LEVEL_NAMES[level]}.`,
    ];
    previous.slice(0, level - 1).forEach((h, i) => lines.push(`\nLevel ${i + 1} already given:\n${h}`));
    if (str(input.notes)) lines.push(`\nMy current thinking:\n${str(input.notes)}`);

    const hint = await generate({
      prompt: 'neetcode-hint',
      messages: [{ role: 'user', content: lines.join('\n') }],
      mock: () => ({
        1: `**Mock hint (level 1).** What would let you check each element against what you've already seen, in O(1)?`,
        2: `**Mock outline (level 2).**\n1. Walk the array once.\n2. Keep a hash map of value → index.\n3. For each element, look up its complement.\n\nTime O(n), space O(n).`,
        3: `**Mock explanation (level 3).** Store each number's index in a map as you go...\n\n\`\`\`python\ndef solve(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n\`\`\``,
      })[level],
    });
    return { level, hint };
  },

  /** Behavioral answer → score, rubric, improvements, a rewrite that uses only the candidate's facts. */
  async 'behavioral-feedback'(input) {
    const question = str(input.question, 500), answer = str(input.answer, 12000);
    const voice = input.mode === 'voice';
    const m = input.metrics || {};
    if (!question) throw new AIError('Missing question.', 400);
    if (answer.split(/\s+/).filter(Boolean).length < 10) throw new AIError('The answer is too short to review. Aim for at least a few sentences.', 400);
    const fillers = m.fillers && typeof m.fillers === 'object' ? Object.entries(m.fillers).slice(0, 20).map(([w, n]) => `${str(w, 20)} ×${num(n, 999)}`).join(', ') : '';

    const content = [
      `Question (${str(input.theme, 60) || 'behavioral'}): ${question}`,
      `Answer mode: ${voice ? 'spoken, transcribed by browser speech recognition' : 'typed'}`,
      `Measurements: ${num(m.words)} words · ${voice ? `spoken for ${fmtSec(num(m.durationSec))} at ${num(m.wpm)} wpm` : `about ${fmtSec(num(m.durationSec))} if spoken at 150 wpm`} · "I/me/my" ×${num(m.iCount)} · "we/us/our" ×${num(m.weCount)}`,
      voice ? `Filler words detected: ${fillers || 'none detected'} (total ${num(m.totalFillers)})` : '',
      `\nAnswer:\n"""\n${answer}\n"""`,
    ].filter(Boolean).join('\n');

    const fb = await generate({
      prompt: 'behavioral-feedback',
      messages: [{ role: 'user', content }],
      schema: BEHAVIORAL_SCHEMA,
      mock: () => mockBehavioral(num(m.words), voice),
    });
    // Normalize so the client can rely on the shape.
    return {
      score: Math.min(10, Math.max(1, Math.round(Number(fb.score) || 1))),
      summary: str(fb.summary, 1000),
      rubric: Object.fromEntries(['star', 'specificity', 'impact', 'results', 'length'].map(k => [k, {
        rating: ['strong', 'okay', 'weak'].includes(fb.rubric?.[k]?.rating) ? fb.rubric[k].rating : 'okay',
        note: str(fb.rubric?.[k]?.note, 500),
      }])),
      improvements: (Array.isArray(fb.improvements) ? fb.improvements : []).slice(0, 3).map(s => str(s, 600)),
      rewrite: str(fb.rewrite, 8000),
      missingDetails: (Array.isArray(fb.missingDetails) ? fb.missingDetails : []).slice(0, 10).map(s => str(s, 200)),
      delivery: voice ? { fillers: str(fb.delivery?.fillers, 600), pacing: str(fb.delivery?.pacing, 600) } : null,
    };
  },
};

function mockBehavioral(words, voice) {
  const short = words < 180;
  return {
    score: short ? 5 : 7,
    summary: `Mock feedback. ${short ? 'Clear situation, but the answer is short and the result is vague.' : 'Good structure; make your own actions and the result more specific.'}`,
    rubric: {
      star: { rating: 'okay', note: 'Situation and action are there; the result is only one sentence.' },
      specificity: { rating: short ? 'weak' : 'okay', note: 'Name the system and the exact change you made.' },
      impact: { rating: 'okay', note: 'Several "we" statements hide what you personally did.' },
      results: { rating: 'weak', note: 'No measurable outcome yet.' },
      length: { rating: short ? 'weak' : 'strong', note: short ? 'Under a minute when spoken; aim for about two.' : 'About the right length.' },
    },
    improvements: [
      'Spend more of the answer on the steps you personally took, in order.',
      'End with a measurable result, like time saved or users affected.',
      'Cut the background to two sentences.',
    ],
    rewrite: 'In my second year I was on a four-person team building [the project]. Two weeks before the demo, I noticed [the problem]. I took ownership of fixing it: first I [your first step], then I [your second step]. As a result, [the measurable outcome], and I learned to [the lesson].',
    missingDetails: ['the project', 'the problem', 'your first step', 'your second step', 'the measurable outcome', 'the lesson'],
    delivery: voice ? { fillers: 'A few fillers ("like", "basically"); pause briefly instead.', pacing: 'Comfortable pace overall.' } : { fillers: '', pacing: '' },
  };
}

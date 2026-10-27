// Resume text extraction (same approach as Interview Room) and AI structuring into sections.
import mammoth from 'mammoth';
import { AIError, generate } from './ai-service.js';

export const MAX_BYTES = 3 * 1024 * 1024; // JSON body limit on Vercel is 4.5 MB; base64 adds a third

export function cleanText(text) {
  return String(text)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^-- \d+ of \d+ --$/gm, '')
    .trim();
}

/** File bytes → plain text. Throws AIError with a user-facing message. */
export async function extractText(fileName, buffer) {
  const name = String(fileName || '').toLowerCase();
  if (name.endsWith('.pdf')) {
    // Loaded only for PDFs, so DOCX and pasted text never depend on the PDF stack.
    const { pdfToText } = await import('./pdf.js');
    return cleanText(await pdfToText(buffer));
  }
  if (name.endsWith('.docx')) return cleanText((await mammoth.extractRawText({ buffer })).value);
  if (name.endsWith('.txt') || name.endsWith('.md')) return cleanText(buffer.toString('utf8'));
  throw new AIError('Upload a PDF or DOCX file, or paste the text instead.', 415);
}

const ENTRY = (extra) => ({ type: 'object', additionalProperties: false, required: [...Object.keys(extra), 'bullets'], properties: { ...extra, bullets: { type: 'array', items: { type: 'string' } } } });
const S = { type: 'string' };
export const RESUME_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['name', 'experience', 'projects', 'skills', 'education'],
  properties: {
    name: S,
    experience: { type: 'array', items: ENTRY({ title: S, organization: S, dates: S }) },
    projects: { type: 'array', items: ENTRY({ name: S, details: S }) },
    skills: { type: 'array', items: S },
    education: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['school', 'degree', 'dates'], properties: { school: S, degree: S, dates: S } } },
  },
};

/** Rough line-based parser, used in MOCK_AI mode (no API key). */
export function heuristicParse(text) {
  const out = { name: '', experience: [], projects: [], skills: [], education: [] };
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  out.name = lines[0] || '';
  let section = null, entry = null;
  const HEAD = { experience: /^(work\s+)?experience|employment/i, projects: /^projects?/i, skills: /^(technical\s+)?skills/i, education: /^education/i };
  for (const line of lines.slice(1)) {
    const head = Object.entries(HEAD).find(([, re]) => re.test(line) && line.length < 30);
    if (head) { section = head[0]; entry = null; continue; }
    const bullet = line.match(/^[-•*▪◦]\s*(.+)/);
    if (section === 'skills') out.skills.push(...line.split(/[,|;]/).map(s => s.trim()).filter(Boolean));
    else if (section === 'education') { const [school, degree = '', dates = ''] = line.split(/,\s*/); out.education.push({ school, degree, dates }); }
    else if (section === 'experience' || section === 'projects') {
      if (bullet && entry) entry.bullets.push(bullet[1]);
      else if (!bullet) {
        const parts = line.split(/,\s*/);
        entry = section === 'experience'
          ? { title: parts[0] || line, organization: parts[1] || '', dates: parts.slice(2).join(', '), bullets: [] }
          : { name: line.replace(/\s*\(.*\)$/, ''), details: (line.match(/\((.*)\)$/) || [])[1] || '', bullets: [] };
        out[section].push(entry);
      }
    }
  }
  return out;
}

export async function structureResume(text) {
  return generate({
    prompt: 'resume-parse',
    messages: [{ role: 'user', content: `Resume text:\n"""\n${text.slice(0, 30000)}\n"""` }],
    schema: RESUME_SCHEMA,
    mock: () => heuristicParse(text),
  });
}

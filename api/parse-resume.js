// POST /api/parse-resume  { fileName, data (base64) }  or  { text }
// → { name, experience, projects, skills, education }
// The file is read in memory and never stored. Requires the app passcode.
import { AIError } from './_lib/ai-service.js';
import { authorize, readBody } from './_lib/auth.js';
import { MAX_BYTES, cleanText, extractText, structureResume } from './_lib/resume.js';

export default async function handler(req, res) {
  if (!authorize(req, res)) return;
  const body = readBody(req, res); if (!body) return;
  try {
    const { fileName, data, text: pasted } = body;
    let text;
    if (typeof pasted === 'string' && pasted.trim()) text = cleanText(pasted.slice(0, 60000));
    else if (typeof data === 'string' && fileName) {
      const buffer = Buffer.from(data, 'base64');
      if (buffer.length > MAX_BYTES) throw new AIError('That file is larger than 3 MB.', 413);
      text = await extractText(fileName, buffer);
    } else throw new AIError('Upload a PDF or DOCX file, or paste the text.', 400);

    if (text.length < 40) throw new AIError("We couldn't find readable text. If it's a scanned image, paste the text instead.", 422);
    const parsed = await structureResume(text);
    const bulletCount = [...parsed.experience, ...parsed.projects].reduce((n, e) => n + e.bullets.length, 0);
    if (!bulletCount) throw new AIError("We couldn't find any bullet points to practice. Check the file, or paste the text with one bullet per line.", 422);
    res.status(200).json(parsed);
  } catch (err) {
    if (!(err instanceof AIError)) console.error('[parse-resume]', err);
    res.status(err instanceof AIError ? err.status : 500).json({ error: err instanceof AIError ? err.message : "We couldn't read that file. Try another format or paste the text." });
  }
}

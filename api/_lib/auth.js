// Shared passcode check for every API endpoint that calls the AI.
import { timingSafeEqual } from 'node:crypto';

function passcodeOK(given) {
  const expected = process.env.APP_PASSCODE || '';
  const a = Buffer.from(String(given || '')), b = Buffer.from(expected);
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

/** Sends an error response and returns false if the request isn't allowed. */
export function authorize(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST.' }); return false; }
  if (!process.env.APP_PASSCODE) { res.status(500).json({ error: 'APP_PASSCODE is not set on the server.' }); return false; }
  if (!passcodeOK(req.headers['x-app-passcode'])) { res.status(401).json({ error: 'Wrong or missing AI passcode. Set it in Settings → Interview Prep.' }); return false; }
  return true;
}

/** The parsed JSON body, or null after sending a 400 if it isn't valid JSON. */
export function readBody(req, res) {
  try { return req.body || {}; } catch { res.status(400).json({ error: "The request wasn't valid JSON." }); return null; }
}

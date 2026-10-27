// POST /api/ai  { feature, input }  →  feature-specific JSON
// Protected by the APP_PASSCODE environment variable (sent as the x-app-passcode header).
import { timingSafeEqual } from 'node:crypto';
import { AIError } from './_lib/ai-service.js';
import { features } from './_lib/features.js';

function passcodeOK(given) {
  const expected = process.env.APP_PASSCODE || '';
  const a = Buffer.from(String(given || '')), b = Buffer.from(expected);
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (!process.env.APP_PASSCODE) return res.status(500).json({ error: 'APP_PASSCODE is not set on the server.' });
  if (!passcodeOK(req.headers['x-app-passcode'])) return res.status(401).json({ error: 'Wrong or missing AI passcode. Set it in Settings → Interview Prep.' });

  const { feature, input } = req.body || {};
  const run = Object.hasOwn(features, feature) ? features[feature] : null;
  if (!run) return res.status(400).json({ error: `Unknown AI feature: ${feature}` });

  try {
    res.status(200).json(await run(input || {}));
  } catch (err) {
    const status = err instanceof AIError ? err.status : 500;
    if (!(err instanceof AIError)) console.error(err);
    res.status(status).json({ error: err instanceof AIError ? err.message : 'Something went wrong on the server.' });
  }
}

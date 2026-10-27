// POST /api/ai  { feature, input }  →  feature-specific JSON
// Protected by the APP_PASSCODE environment variable (sent as the x-app-passcode header).
import { AIError } from './_lib/ai-service.js';
import { authorize, readBody } from './_lib/auth.js';
import { features } from './_lib/features.js';

export default async function handler(req, res) {
  if (!authorize(req, res)) return;
  const body = readBody(req, res); if (!body) return;
  const { feature, input } = body;
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

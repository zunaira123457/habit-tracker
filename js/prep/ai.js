'use strict';
// Browser side of the AI: every request goes to our own /api/ai endpoint.
// The API key never reaches the browser; only the app passcode is sent.
import { ui } from '../store.js';

/** POST JSON to one of our API endpoints, with the app passcode. */
export async function postApi(path, body) {
  let res;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-app-passcode': ui.aiPasscode || '' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the AI server. Check your connection.");
  }
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    if (res.status === 404 || res.status === 501) throw new Error('The AI server isn\'t running here. Start the app with "npm run serve".');
    throw new Error(data.error || `AI request failed (${res.status}).`);
  }
  return data;
}

export const askAI = (feature, input) => postApi('/api/ai', { feature, input });

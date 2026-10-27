'use strict';
// Browser side of the AI: every request goes to our own /api/ai endpoint.
// The API key never reaches the browser; only the app passcode is sent.
import { ui } from '../store.js';

export async function askAI(feature, input) {
  let res;
  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-app-passcode': ui.aiPasscode || '' },
      body: JSON.stringify({ feature, input }),
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

'use strict';
// Main-thread side of the sandbox. Runs tests in a Web Worker and kills it if a run takes too long,
// so an infinite loop in the user's code can't freeze the app.

let worker = null;
let pythonReady = false;
let nextId = 1;
const pending = new Map();

function spawn() {
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id); if (!p) return;
    pending.delete(data.id); clearTimeout(p.timer);
    if (data.ok) p.resolve(data.result); else p.reject(new Error(data.error));
  };
  worker.onerror = e => {
    const msg = e.message || 'The sandbox crashed.';
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error(msg)); }
    pending.clear(); reset();
  };
  return worker;
}
function reset() { worker?.terminate(); worker = null; pythonReady = false; }

function call(message, timeoutMs, timeoutMessage) {
  const id = nextId++;
  const w = worker || spawn();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id); reset();
      reject(new Error(timeoutMessage));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    w.postMessage({ id, ...message });
  });
}

/** Load Python (about 10 MB the first time; cached by the browser after that). */
export async function warmPython() {
  if (pythonReady) return;
  await call({ type: 'warm' }, 90000, "Python didn't load in time. Check your connection and try again.");
  pythonReady = true;
}
export const isPythonReady = () => pythonReady;

/**
 * Run tests. Resolves to { results, passed, failed, total, logs }.
 * Rejects with a friendly message if the run times out (the worker is restarted).
 */
export async function runTests({ language, files, tests, timeoutMs = 10000 }) {
  if (language === 'python') await warmPython();
  return call({ type: 'run', language, files, tests }, timeoutMs,
    `Stopped after ${timeoutMs / 1000}s. Is there an infinite loop, or a promise that never settles?`);
}

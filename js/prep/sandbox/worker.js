// Sandbox worker: runs a challenge's tests off the main thread.
// JavaScript runs through js-runner.js; Python runs through py_runner.py inside Pyodide.
// The page terminates this worker if a run takes too long (e.g. an infinite loop).
import { runJsTests } from './js-runner.js';

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/';
let pyodide = null;

async function getPyodide() {
  if (pyodide) return pyodide;
  const { loadPyodide } = await import(`${PYODIDE_URL}pyodide.mjs`);
  const py = await loadPyodide({ indexURL: PYODIDE_URL });
  const runner = await (await fetch(new URL('./py_runner.py', import.meta.url))).text();
  py.FS.mkdirTree('/home/pyodide/sandbox');
  py.FS.writeFile('/home/pyodide/sandbox/py_runner.py', runner);
  await py.runPythonAsync('import sys\nif "/home/pyodide/sandbox" not in sys.path: sys.path.append("/home/pyodide/sandbox")');
  pyodide = py;
  return py;
}

async function runPython(id, files, tests) {
  const py = await getPyodide();
  const root = `/home/pyodide/run_${id}`;
  for (const [path, src] of Object.entries(files)) {
    const full = `${root}/${path}`;
    py.FS.mkdirTree(full.slice(0, full.lastIndexOf('/')));
    py.FS.writeFile(full, src);
  }
  py.globals.set('RUN_ROOT', root);
  py.globals.set('RUN_TESTS', py.toPy(tests));
  try {
    const json = await py.runPythonAsync('import json, py_runner\njson.dumps(await py_runner.run_tests(RUN_ROOT, list(RUN_TESTS)))');
    return JSON.parse(json);
  } finally {
    await py.runPythonAsync('import shutil\nshutil.rmtree(RUN_ROOT, ignore_errors=True)');
  }
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    if (type === 'warm') { await getPyodide(); self.postMessage({ id, ok: true }); return; }
    const result = data.language === 'python'
      ? await runPython(id, data.files, data.tests)
      : await runJsTests(data.files, data.tests);
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err?.message || err) });
  }
};

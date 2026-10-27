// Runs a small CommonJS-style JavaScript project and its tests.
// Shared by the browser sandbox worker and scripts/validate-challenges.mjs, so both behave the same.
//
// Project files use `module.exports` / `require('./relative/path')`. Test files get two globals:
//   test(name, fn)  — fn may be async
//   assert          — ok, equal, strictEqual, notStrictEqual, deepStrictEqual, throws, rejects

export class AssertionError extends Error { constructor(m) { super(m); this.name = 'AssertionError'; } }

const show = v => {
  if (typeof v === 'string') return JSON.stringify(v);
  if (v instanceof Map) return `Map(${show([...v])})`;
  if (v instanceof Set) return `Set(${show([...v])})`;
  try { const s = JSON.stringify(v); return s === undefined ? String(v) : s; } catch { return String(v); }
};
function deepEq(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (a instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Map || a instanceof Set) return a.size === b.size && deepEq([...a], [...b]);
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.hasOwn(b, k) && deepEq(a[k], b[k]));
}
const matches = (err, matcher) => !matcher || (matcher instanceof RegExp ? matcher.test(String(err?.message ?? err)) : err instanceof matcher);

export const assert = {
  ok(v, msg) { if (!v) throw new AssertionError(msg || `Expected a truthy value, got ${show(v)}`); },
  equal(a, b, msg) { if (a != b) throw new AssertionError(msg || `Expected ${show(a)} to equal ${show(b)}`); }, // eslint-disable-line eqeqeq
  strictEqual(a, b, msg) { if (!Object.is(a, b)) throw new AssertionError(msg || `Expected ${show(a)} to be ${show(b)}`); },
  notStrictEqual(a, b, msg) { if (Object.is(a, b)) throw new AssertionError(msg || `Expected values to differ, both were ${show(a)}`); },
  deepStrictEqual(a, b, msg) { if (!deepEq(a, b)) throw new AssertionError(msg || `Expected ${show(a)} to deeply equal ${show(b)}`); },
  throws(fn, matcher, msg) {
    try { fn(); } catch (e) { if (matches(e, matcher)) return; throw new AssertionError(msg || `Threw the wrong error: ${e?.message ?? e}`); }
    throw new AssertionError(msg || 'Expected the function to throw');
  },
  async rejects(p, matcher, msg) {
    try { await (typeof p === 'function' ? p() : p); } catch (e) { if (matches(e, matcher)) return; throw new AssertionError(msg || `Rejected with the wrong error: ${e?.message ?? e}`); }
    throw new AssertionError(msg || 'Expected the promise to reject');
  },
};
assert.deepEqual = assert.deepStrictEqual;

const WRAPPER_LINES = 2; // new Function adds two lines before the body

function normalize(p) {
  const out = [];
  for (const seg of p.split('/')) { if (!seg || seg === '.') continue; if (seg === '..') out.pop(); else out.push(seg); }
  return out.join('/');
}
const dirOf = p => p.split('/').slice(0, -1).join('/');

/** Turn an error into { message, trace } with stack frames limited to project files. */
function describe(err, files) {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : `Thrown: ${show(err)}`;
  const trace = [];
  for (const line of String(err?.stack || '').split('\n')) {
    const m = line.match(/([\w./-]+\.js):(\d+)(?::(\d+))?/);
    if (m && Object.hasOwn(files, m[1])) trace.push(`${m[1]}:${Math.max(1, Number(m[2]) - WRAPPER_LINES)}`);
  }
  return { message, trace: [...new Set(trace)].slice(0, 6) };
}

/**
 * @param {Record<string,string>} files  path → source
 * @param {string[]} testPaths            which files are test files
 * @returns {Promise<{results, passed, failed, total, logs}>}
 */
export async function runJsTests(files, testPaths, { timeoutPerTest = 3000 } = {}) {
  const cache = new Map(), logs = [], tests = [], results = [];
  const log = (...a) => { if (logs.length < 200) logs.push(a.map(x => (typeof x === 'string' ? x : show(x))).join(' ')); };
  const sandboxConsole = { log, info: log, warn: log, error: log, debug: log };

  function resolve(from, spec) {
    if (!spec.startsWith('.')) throw new Error(`Cannot find module '${spec}'. Only relative project files can be required.`);
    const base = normalize(`${dirOf(from)}/${spec}`);
    for (const c of [base, `${base}.js`, `${base}/index.js`]) if (Object.hasOwn(files, c)) return c;
    throw new Error(`Cannot find module '${spec}' (required from ${from})`);
  }
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const fn = new Function('module', 'exports', 'require', 'console', 'test', 'assert', `${files[path]}\n//# sourceURL=${path}`);
    fn(module, module.exports, spec => load(resolve(path, spec)), sandboxConsole, (name, f) => tests.push({ file: path, name, fn: f }), assert);
    return module.exports;
  }

  for (const file of testPaths) {
    try { load(file); } catch (e) { results.push({ file, name: '(loading the test file)', ok: false, error: describe(e, files) }); }
  }
  for (const t of tests) {
    let timer;
    try {
      await Promise.race([
        Promise.resolve().then(() => t.fn()),
        new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`Timed out after ${timeoutPerTest / 1000}s (is a promise never resolving?)`)), timeoutPerTest); }),
      ]);
      results.push({ file: t.file, name: t.name, ok: true });
    } catch (e) {
      results.push({ file: t.file, name: t.name, ok: false, error: describe(e, files) });
    } finally { clearTimeout(timer); }
  }
  const passed = results.filter(r => r.ok).length;
  return { results, passed, failed: results.length - passed, total: results.length, logs };
}

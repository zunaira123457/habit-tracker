// Builds and validates every debugging challenge in data/debugging/.
//
// For each challenge it:
//   1. applies the bug fixes listed in meta.json to produce solution/ files
//   2. checks the hidden tests FAIL on the buggy code and PASS on the fixed code
//   3. checks the visible tests fail on the buggy code and pass on the fixed code
//   4. checks every bug is caught on its own (all other bugs fixed → hidden tests still fail)
// Then it writes data/debugging/index.json for the app.
//
// Usage: node scripts/validate-challenges.mjs [challenge-id ...]
import { readFile, writeFile, readdir, mkdir, rm, mkdtemp, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIR = path.join(ROOT, 'data/debugging');
const PY_RUNNER = path.join(ROOT, 'js/prep/sandbox/py_runner.py');
const JS_CHILD = path.join(ROOT, 'scripts/run-js-child.mjs');
const LEVELS = { easy: 0, medium: 1, hard: 2 };
const BUG_TYPES = ['off-by-one', 'wrong-conditional', 'mutation-aliasing', 'async-race', 'edge-case', 'wrong-data-structure'];

async function walk(dir, base = dir) {
  const out = {};
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) Object.assign(out, await walk(full, base));
    else if (!e.name.startsWith('.') && !e.name.endsWith('.pyc')) out[path.relative(base, full).split(path.sep).join('/')] = await readFile(full, 'utf8');
  }
  return out;
}

function applyFixes(files, bugs) {
  const out = { ...files };
  for (const b of bugs) {
    const src = out[b.file];
    if (src == null) throw new Error(`bug fix targets missing file ${b.file}`);
    const n = src.split(b.find).length - 1;
    if (n !== 1) throw new Error(`fix for ${b.file} must match exactly once, matched ${n} times: ${JSON.stringify(b.find.slice(0, 60))}`);
    out[b.file] = src.replace(b.find, () => b.replace);
  }
  return out;
}

function runChild(cmd, args, input, timeoutMs) {
  return new Promise(resolve => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve({ timeout: true }); }, timeoutMs);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('close', () => {
      clearTimeout(timer);
      try { resolve(JSON.parse(out.trim().split('\n').pop())); } catch { resolve({ crash: (err || out).slice(-800) }); }
    });
    if (input) child.stdin.end(input); else child.stdin.end();
  });
}

async function runTests(language, files, tests) {
  if (language === 'javascript') return runChild(process.execPath, [JS_CHILD], JSON.stringify({ files, tests }), 15000);
  const dir = await mkdtemp(path.join(tmpdir(), 'challenge-'));
  try {
    for (const [p, src] of Object.entries(files)) {
      await mkdir(path.dirname(path.join(dir, p)), { recursive: true });
      await writeFile(path.join(dir, p), src);
    }
    return await runChild('python3', ['-B', PY_RUNNER, dir, ...tests], null, 20000);
  } finally { await rm(dir, { recursive: true, force: true }); }
}

const summary = r => (r.timeout ? 'TIMEOUT' : r.crash ? `CRASH ${r.crash}` : `${r.passed}/${r.total} passed`);
const allPass = r => !r.timeout && !r.crash && r.total > 0 && r.failed === 0;
const someFail = r => !r.crash && (r.timeout || r.failed > 0);

async function validate(id) {
  const base = path.join(DIR, id);
  const meta = JSON.parse(await readFile(path.join(base, 'meta.json'), 'utf8'));
  const src = await walk(path.join(base, 'src'));
  const hidden = await walk(path.join(base, 'hidden'));
  const errors = [];
  const ext = meta.language === 'python' ? '.py' : '.js';
  const isTest = p => (meta.language === 'python' ? /(^|\/)test_[^/]*\.py$/.test(p) : /\.test\.js$/.test(p));
  const visibleTests = Object.keys(src).filter(isTest).sort();
  const hiddenTests = Object.keys(hidden).filter(isTest).sort();

  if (!['python', 'javascript'].includes(meta.language)) errors.push(`bad language ${meta.language}`);
  if (!(meta.difficulty in LEVELS)) errors.push(`bad difficulty ${meta.difficulty}`);
  if (!meta.bugs?.length || meta.bugs.length > 3) errors.push('needs 1–3 bugs');
  for (const b of meta.bugs || []) if (!BUG_TYPES.includes(b.type)) errors.push(`unknown bug type ${b.type}`);
  for (const f of ['description.md', 'SOLUTION.md']) { try { await stat(path.join(base, f)); } catch { errors.push(`missing ${f}`); } }
  if (!visibleTests.length) errors.push('no visible tests in src/tests');
  if (!hiddenTests.length) errors.push('no hidden tests');
  if (Object.keys(hidden).some(p => Object.hasOwn(src, p))) errors.push('hidden files must not overwrite src files');
  const projectFiles = Object.keys(src).filter(p => p.endsWith(ext) && !isTest(p));
  const dirs = new Set(projectFiles.filter(p => p.includes('/')).map(p => p.split('/')[0]));
  if (projectFiles.length < 3 || dirs.size < 2) errors.push(`needs a multi-file project across folders (has ${projectFiles.length} files in ${dirs.size} folders)`);
  if (errors.length) return { id, meta, errors };

  let fixed;
  try { fixed = applyFixes(src, meta.bugs); } catch (e) { return { id, meta, errors: [e.message] }; }

  const [buggyHidden, fixedHidden, buggyVisible, fixedVisible] = await Promise.all([
    runTests(meta.language, { ...src, ...hidden }, hiddenTests),
    runTests(meta.language, { ...fixed, ...hidden }, hiddenTests),
    runTests(meta.language, src, visibleTests),
    runTests(meta.language, fixed, visibleTests),
  ]);
  if (!someFail(buggyHidden)) errors.push(`hidden tests should fail on buggy code: ${summary(buggyHidden)}`);
  if (!allPass(fixedHidden)) errors.push(`hidden tests should pass on fixed code: ${summary(fixedHidden)} ${JSON.stringify(fixedHidden.results?.filter(r => !r.ok).slice(0, 2))}`);
  if (!someFail(buggyVisible)) errors.push(`visible tests should show the symptom on buggy code: ${summary(buggyVisible)}`);
  if (!allPass(fixedVisible)) errors.push(`visible tests should pass on fixed code: ${summary(fixedVisible)} ${JSON.stringify(fixedVisible.results?.filter(r => !r.ok).slice(0, 2))}`);
  if (meta.bugs.length > 1) {
    const each = await Promise.all(meta.bugs.map((_, i) => runTests(meta.language, { ...applyFixes(src, meta.bugs.filter((__, j) => j !== i)), ...hidden }, hiddenTests)));
    each.forEach((r, i) => { if (!someFail(r)) errors.push(`bug ${i + 1} (${meta.bugs[i].type} in ${meta.bugs[i].file}) is not caught on its own: ${summary(r)}`); });
  }

  // Write solution/ (only the files a fix touches). Unchanged files are left alone.
  const wanted = new Set(meta.bugs.map(b => b.file));
  const existing = await walk(path.join(base, 'solution'));
  for (const f of Object.keys(existing)) if (!wanted.has(f)) await rm(path.join(base, 'solution', f));
  for (const f of wanted) {
    if (existing[f] === fixed[f]) continue;
    await mkdir(path.dirname(path.join(base, 'solution', f)), { recursive: true });
    await writeFile(path.join(base, 'solution', f), fixed[f]);
  }
  return {
    id, meta, errors, buggy: summary(buggyHidden),
    entry: {
      id, title: meta.title, language: meta.language, difficulty: meta.difficulty, order: meta.order, summary: meta.summary,
      bugCount: meta.bugs.length, bugTypes: [...new Set(meta.bugs.map(b => b.type))], crossFile: meta.bugs.some(b => b.crossFile),
      files: Object.keys(src).sort(), visibleTests, hiddenTests, solutionFiles: [...new Set(meta.bugs.map(b => b.file))],
    },
  };
}

const only = process.argv.slice(2);
const ids = (await readdir(DIR, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).filter(id => !only.length || only.includes(id)).sort();
const results = [];
for (let i = 0; i < ids.length; i += 4) results.push(...await Promise.all(ids.slice(i, i + 4).map(validate)));

let failed = 0;
for (const r of results) {
  if (r.errors.length) { failed++; console.log(`✗ ${r.id}`); r.errors.forEach(e => console.log(`    ${e}`)); }
  else console.log(`✓ ${r.id.padEnd(28)} ${r.meta.language.padEnd(10)} ${r.meta.difficulty.padEnd(6)} ${r.meta.bugs.length} bug(s)  buggy: ${r.buggy}`);
}
if (!only.length && !failed) {
  const entries = results.map(r => r.entry).sort((a, b) => a.order - b.order);
  await writeFile(path.join(DIR, 'index.json'), JSON.stringify({ challenges: entries }, null, 2) + '\n');
  const by = k => entries.reduce((m, e) => ({ ...m, [e[k]]: (m[e[k]] || 0) + 1 }), {});
  console.log(`\nWrote index.json: ${entries.length} challenges`, by('language'), by('difficulty'));
  const types = {}; entries.forEach(e => e.bugTypes.forEach(t => { types[t] = (types[t] || 0) + 1; }));
  console.log('Bug types:', types, `cross-file: ${entries.filter(e => e.crossFile).length}`);
}
console.log(failed ? `\n${failed} challenge(s) failed validation` : '\nAll challenges valid');
process.exit(failed ? 1 : 0);

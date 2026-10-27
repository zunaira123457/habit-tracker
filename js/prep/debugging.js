'use strict';
// Debugging challenges: catalog, daily pick, saved edits, and grading with the hidden tests.
import { prep, savePrep } from './state.js';
import { runTests } from './sandbox/sandbox.js';
import { diffProject } from './diff.js';

let index = null;
const byId = new Map();
const srcCache = new Map();     // id -> { path: original source }

export async function loadChallenges() {
  if (index) return index;
  const res = await fetch('data/debugging/index.json');
  if (!res.ok) throw new Error(`Couldn't load the debugging challenges (${res.status}).`);
  index = (await res.json()).challenges.sort((a, b) => a.order - b.order);
  index.forEach(c => byId.set(c.id, c));
  return index;
}
export const challengesReady = () => !!index;
export const challengeOf = id => byId.get(id);
export const allChallenges = () => index || [];

const fetchText = async url => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Couldn't load ${url} (${r.status}).`);
  return r.text();
};
const base = id => `data/debugging/${id}`;

/** Original (buggy) project files. */
export async function originalFiles(id) {
  if (!srcCache.has(id)) {
    const c = challengeOf(id);
    const entries = await Promise.all(c.files.map(async p => [p, await fetchText(`${base(id)}/src/${p}`)]));
    srcCache.set(id, Object.fromEntries(entries));
  }
  return srcCache.get(id);
}
export const descriptionOf = id => fetchText(`${base(id)}/description.md`);
export const solutionNotesOf = id => fetchText(`${base(id)}/SOLUTION.md`);
export async function solutionFiles(id) {
  const c = challengeOf(id);
  return Object.fromEntries(await Promise.all(c.solutionFiles.map(async p => [p, await fetchText(`${base(id)}/solution/${p}`)])));
}

/* ---------- saved progress ---------- */
export const record = id => ((prep.debugging ??= {})[id] ??= { files: {}, submissions: [], hints: [], revealed: false, solvedOn: null, skipped: false });
export async function currentFiles(id) {
  return { ...(await originalFiles(id)), ...record(id).files };
}
export function saveEdit(id, path, content, original) {
  const r = record(id);
  if (content === original) delete r.files[path]; else r.files[path] = content;
  savePrep();
}
export function resetFiles(id, path) {
  const r = record(id);
  if (path) delete r.files[path]; else r.files = {};
  savePrep();
}
export const isModified = (id, path) => Object.hasOwn(record(id).files, path);

/* ---------- daily pick ---------- */
const eligible = c => {
  const r = prep.debugging?.[c.id];
  const lang = prep.settings.debugLanguage || 'both';
  return !r?.solvedOn && !r?.skipped && (lang === 'both' || c.language === lang);
};
/** Today's challenge: the first unsolved one in order (so an unfinished one carries over). */
export function ensureDebugging(date) {
  if (!index) return null;
  const day = (prep.days[date] ??= { leetcode: [] });
  const current = day.debugging;
  // Re-pick if today's challenge was skipped or no longer matches the language setting.
  if (!current || (!current.done && current.id && !eligible(challengeOf(current.id) || {}))) {
    const next = index.find(eligible);
    day.debugging = next ? { id: next.id, done: false } : { id: null, done: true };
    savePrep();
  }
  return day.debugging;
}
export function skipChallenge(date, id) {
  record(id).skipped = true;
  const day = prep.days[date];
  if (day?.debugging?.id === id) day.debugging = null;
  savePrep();
  return ensureDebugging(date);
}

/* ---------- running tests ---------- */
export async function runVisible(id) {
  const c = challengeOf(id);
  return runTests({ language: c.language, files: await currentFiles(id), tests: c.visibleTests });
}

/** Grade with the hidden tests. Returns { result, submission }. */
export async function submit(id, date) {
  const c = challengeOf(id);
  const files = await currentFiles(id);
  const hidden = Object.fromEntries(await Promise.all(c.hiddenTests.map(async p => [p, await fetchText(`${base(id)}/hidden/${p}`)])));
  const result = await runTests({ language: c.language, files: { ...files, ...hidden }, tests: c.hiddenTests, timeoutMs: 15000 });
  const passed = result.total > 0 && result.failed === 0;
  const r = record(id);
  const submission = {
    date, passed, passedCount: result.passed, total: result.total,
    failures: result.results.filter(x => !x.ok).map(x => ({ name: x.name, message: x.error?.message || '' })),
    diff: diffProject(await originalFiles(id), files),
    hintsUsed: r.hints.length, revealed: r.revealed, review: null, reviewError: null,
  };
  r.submissions.push(submission);
  if (passed && !r.solvedOn) r.solvedOn = date;
  const day = prep.days[date];
  if (passed && day?.debugging?.id === id) day.debugging.done = true;
  savePrep();
  return { result, submission };
}

export function debuggingStats() {
  const all = allChallenges();
  const solved = all.filter(c => prep.debugging?.[c.id]?.solvedOn);
  return {
    total: all.length,
    solved: solved.length,
    clean: solved.filter(c => !prep.debugging[c.id].revealed).length,
    byDifficulty: ['easy', 'medium', 'hard'].map(d => ({ d, total: all.filter(c => c.difficulty === d).length, solved: solved.filter(c => c.difficulty === d).length })),
  };
}

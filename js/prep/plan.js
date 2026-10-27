'use strict';
// NeetCode 250 daily plan: 2 new problems in curriculum order + 1 spaced-repetition review.
import { addDays, parseKey, keyOf } from '../util.js';
import { prep, savePrep, REVIEW_INTERVALS, DONE_RESULTS } from './state.js';

let catalog = null;          // { categories, problems }
const bySlug = new Map();

export async function loadCatalog() {
  if (catalog) return catalog;
  const res = await fetch('data/neetcode250.json');
  if (!res.ok) throw new Error(`Couldn't load the NeetCode list (${res.status}).`);
  catalog = await res.json();
  catalog.problems.forEach((p, i) => bySlug.set(p.slug, { ...p, order: i }));
  return catalog;
}
export const catalogReady = () => !!catalog;
export const problemOf = slug => bySlug.get(slug);

const record = slug => (prep.problems[slug] ??= { status: null, attempts: [], review: null });
export const everDone = slug => (prep.problems[slug]?.attempts || []).some(a => DONE_RESULTS.includes(a.result));
const started = slug => everDone(slug) || prep.problems[slug]?.status === 'skipped';
const newSlot = (slug, kind) => ({ slug, kind, result: null, seconds: 0, hints: [], prev: null });

function nextNew(exclude) {
  return catalog.problems.find(p => !started(p.slug) && !exclude.has(p.slug))?.slug ?? null;
}
function nextReview(date, exclude) {
  const due = Object.entries(prep.problems)
    .filter(([slug, r]) => r.review?.due && r.review.due <= date && !exclude.has(slug))
    .sort(([, a], [, b]) => a.review.due.localeCompare(b.review.due) || (b.status === 'struggled') - (a.status === 'struggled'));
  return due[0]?.[0] ?? null;
}

/** Today's plan, created the first time it's needed. Returns null until the catalog has loaded. */
export function ensureDay(date) {
  if (!catalog) return null;
  const day = (prep.days[date] ??= { leetcode: [] });
  if (!day.generated) {
    const taken = new Set();
    const add = (slug, kind) => { if (slug) { day.leetcode.push(newSlot(slug, kind)); taken.add(slug); } };
    add(nextNew(taken), 'new');
    add(nextNew(taken), 'new');
    const review = nextReview(date, taken);
    // Nothing due for review yet (e.g. the first days): use the slot for one more new problem.
    if (review) add(review, 'review'); else add(nextNew(taken), 'new');
    day.generated = true;
    savePrep();
  }
  return day;
}

const slotOf = (date, slug) => prep.days[date]?.leetcode.find(s => s.slug === slug);

/* ---- timer (one problem at a time) ---- */
export function slotSeconds(date, slot) {
  const t = prep.timer;
  return slot.seconds + (t && t.date === date && t.slug === slot.slug ? Math.max(0, (Date.now() - t.start) / 1000) : 0);
}
export function stopTimer() {
  const t = prep.timer; if (!t) return;
  const slot = slotOf(t.date, t.slug);
  if (slot) slot.seconds += Math.max(0, (Date.now() - t.start) / 1000);
  prep.timer = null;
}
export function toggleTimer(date, slug) {
  const running = prep.timer?.slug === slug && prep.timer?.date === date;
  stopTimer();
  if (!running) prep.timer = { date, slug, start: Date.now() };
  savePrep();
}

/* ---- results ---- */
/** Solved / Struggled: record the attempt and schedule the next review. */
export function markResult(date, slug, result) {
  const slot = slotOf(date, slug); if (!slot || slot.result) return;
  if (prep.timer?.slug === slug) stopTimer();
  const r = record(slug);
  slot.prev = { status: r.status, review: r.review && { ...r.review }, attempts: r.attempts.length };
  slot.result = result;
  r.status = result;
  r.attempts.push({ date, result, seconds: Math.round(slot.seconds) });
  if (result === 'struggled' || slot.kind === 'new' || !r.review) {
    r.review = { step: 0, due: addDays(date, REVIEW_INTERVALS[0]) }; // struggling restarts the schedule at 1 day
  } else {
    const step = r.review.step + 1;
    r.review = step < REVIEW_INTERVALS.length ? { step, due: addDays(date, REVIEW_INTERVALS[step]) } : { step, due: null }; // graduated
  }
  savePrep();
}
export function undoResult(date, slug) {
  const slot = slotOf(date, slug); if (!slot?.result || !slot.prev) return;
  const r = record(slug);
  r.status = slot.prev.status; r.review = slot.prev.review; r.attempts.length = slot.prev.attempts;
  slot.result = null; slot.prev = null;
  savePrep();
}
/** Skip: a new problem is set aside for good and replaced by the next one; a review moves to tomorrow. */
export function skipSlot(date, slug) {
  const day = prep.days[date]; const i = day?.leetcode.findIndex(s => s.slug === slug);
  if (i == null || i < 0 || day.leetcode[i].result) return null;
  if (prep.timer?.slug === slug) stopTimer();
  const slot = day.leetcode[i], r = record(slug);
  r.attempts.push({ date, result: 'skipped', seconds: Math.round(slot.seconds) });
  if (slot.kind === 'new') r.status = 'skipped';
  else if (r.review) r.review.due = addDays(date, 1);
  const taken = new Set(day.leetcode.map(s => s.slug));
  const replacement = slot.kind === 'new' ? nextNew(taken) : nextReview(date, taken);
  if (replacement) day.leetcode.splice(i, 1, newSlot(replacement, slot.kind)); else day.leetcode.splice(i, 1);
  savePrep();
  return replacement;
}
export function unskip(slug) {
  const r = prep.problems[slug]; if (r?.status === 'skipped') { r.status = null; savePrep(); }
}

/* ---- progress ---- */
export function progressStats(today) {
  const total = catalog.problems.length;
  const firstDone = {};
  for (const [slug, r] of Object.entries(prep.problems)) {
    const a = r.attempts.find(x => DONE_RESULTS.includes(x.result));
    if (a) firstDone[slug] = a.date;
  }
  const solved = Object.keys(firstDone).length;
  const byCategory = catalog.categories.map(name => {
    const ps = catalog.problems.filter(p => p.category === name);
    return { name, total: ps.length, solved: ps.filter(p => firstDone[p.slug]).length };
  });
  const due = Object.values(prep.problems).filter(r => r.review?.due && r.review.due <= today).length;
  const skipped = Object.entries(prep.problems).filter(([, r]) => r.status === 'skipped').map(([slug]) => slug);

  // Pace: new problems finished per day over the last 14 days (or since the first one, if sooner).
  const dates = Object.values(firstDone).sort();
  let pace = 0, finish = null;
  if (dates.length) {
    const windowStart = [dates[0], addDays(today, -13)].sort().pop();
    const days = Math.round((parseKey(today) - parseKey(windowStart)) / 864e5) + 1;
    pace = dates.filter(d => d >= windowStart).length / days;
  }
  const remaining = total - solved;
  if (remaining === 0) finish = today;
  else if (pace > 0) finish = addDays(today, Math.ceil(remaining / pace));
  const plannedFinish = addDays(today, Math.ceil(remaining / 2)); // at the plan's 2 new per day
  return { total, solved, byCategory, due, skipped, pace, finish, plannedFinish };
}
export const formatDate = k => parseKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
export { keyOf };

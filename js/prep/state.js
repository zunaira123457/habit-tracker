'use strict';
// Interview Prep data, stored under its own localStorage key so habit data is untouched.
// Imports only util.js, so store.js can depend on it without an import cycle.

export const PREP_KEY = 'pawstreak.prep.v1';
export const XP = { full: 10, light: 4 };
export const REVIEW_INTERVALS = [1, 3, 7, 21]; // days until each successive review
export const DONE_RESULTS = ['solved', 'struggled'];

export function defaultPrep() {
  return {
    version: 1,
    enabled: true,                      // counts toward the streak as one more must-do
    settings: { lightDay: { leetcode: 1, behavioral: 1, debugging: 0 }, debugLanguage: 'both' },
    problems: {},                       // slug → { status, attempts: [{date, result, seconds}], review: {step, due} }
    days: {},                           // date → { leetcode: [slot], behavioral: [{ qid, answerId, draft }] }
    answers: {},                        // question id → [answer] (every attempt, with AI feedback)
    debugging: {},                      // challenge id → { files (edits), submissions, hints, revealed, solvedOn, skipped }
    timer: null,                        // { date, slug, start } for the one running problem timer
  };
}
function loadPrep() {
  try {
    const s = JSON.parse(localStorage.getItem(PREP_KEY) || 'null');
    if (s && s.version === 1) {
      const d = defaultPrep();
      return { ...d, ...s, settings: { ...d.settings, ...s.settings, lightDay: { ...d.settings.lightDay, ...s.settings?.lightDay } } };
    }
  } catch (e) {}
  return defaultPrep();
}
export let prep = loadPrep();
export function savePrep() { try { localStorage.setItem(PREP_KEY, JSON.stringify(prep)); } catch (e) {} }
export function replacePrep(next) { prep = next; }

const slotDone = s => DONE_RESULTS.includes(s.result);

export const SECTIONS = ['leetcode', 'debugging', 'behavioral'];
export const SECTION_TARGET = { leetcode: 3, debugging: 1, behavioral: 2 };

/** Per-section progress for a day: { leetcode: { done, total }, behavioral: { done, total } }. */
export function dayProgress(date) {
  const d = prep.days[date] || {};
  const lc = d.leetcode || [], bq = d.behavioral || [], dbg = d.debugging;
  return {
    leetcode: { done: lc.filter(slotDone).length, total: lc.length },
    debugging: { done: dbg?.done ? 1 : 0, total: dbg ? 1 : 0 },
    behavioral: { done: bq.filter(s => s.answerId).length, total: bq.length },
  };
}

/** 'full' when every section is finished, 'light' when the light-day minimum is met, else 'none'. */
export function prepLevel(date) {
  const p = dayProgress(date);
  if (SECTIONS.every(k => p[k].total > 0 && p[k].done === p[k].total)) return 'full';
  const min = prep.settings.lightDay;
  const needed = SECTIONS.reduce((n, k) => n + (min[k] || 0), 0);
  if (needed > 0 && SECTIONS.every(k => p[k].done >= (min[k] || 0))) return 'light';
  return 'none';
}

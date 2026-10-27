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
    settings: { lightDay: { leetcode: 1 } },
    problems: {},                       // slug → { status, attempts: [{date, result, seconds}], review: {step, due} }
    days: {},                           // date → { leetcode: [slot] }
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

/** Per-section progress for a day: { leetcode: { done, total } }. */
export function dayProgress(date) {
  const lc = prep.days[date]?.leetcode || [];
  return { leetcode: { done: lc.filter(slotDone).length, total: lc.length } };
}

/** 'full' when every section is finished, 'light' when the light-day minimum is met, else 'none'. */
export function prepLevel(date) {
  const p = dayProgress(date);
  const lc = p.leetcode;
  if (lc.total > 0 && lc.done === lc.total) return 'full';
  if (lc.done >= Math.max(1, prep.settings.lightDay.leetcode)) return 'light';
  return 'none';
}

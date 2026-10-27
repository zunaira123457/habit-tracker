'use strict';
import { EPS, KEY, THRESH, UI_KEY, addDays, parseKey, todayKey, uid } from './util.js';

/* ================= State ================= */
export function defaultState() {
  const t = todayKey();
  return {
    version: 1, catName: 'Mochi', startDate: t, currentDay: t,
    tasks: [
      { id: uid(), name: 'Read', emoji: '📚', type: 'time', target: 20, unit: 'min', nonneg: true },
      { id: uid(), name: 'Drink water', emoji: '💧', type: 'count', target: 8, unit: 'glasses', nonneg: true },
      { id: uid(), name: 'Stretch', emoji: '🧘', type: 'time', target: 10, unit: 'min', nonneg: false },
    ],
    progress: {}, timer: null, history: {}, longest: 0,
  };
}
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.tasks)) return Object.assign(defaultState(), s); }
  } catch (e) {}
  return defaultState();
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

export let state = load();
/** Swap in a whole new state object (used by "Reset all data"). */
export function replaceState(next) { state = next; }

/* UI preferences (theme, sidebar) are kept apart from habit data */
export function loadUI() { try { return Object.assign({ theme: 'system', sidebar: 'expanded' }, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); } catch (e) { return { theme: 'system', sidebar: 'expanded' }; } }
export function saveUI() { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) {} }
export const ui = loadUI();

export const findTask = id => state.tasks.find(t => t.id === id);
export const unitOf = t => t.type === 'time' ? 'min' : (t.unit || 'times');
export function val(t) {
  let v = state.progress[t.id] || 0;
  if (t.type === 'time' && state.timer && state.timer.id === t.id) v += Math.max(0, Date.now() - state.timer.start) / 60000;
  return v;
}
export const isDone = t => val(t) >= t.target - EPS;
export const dayOK = (tasks, getV) => { const nn = tasks.filter(t => t.nonneg); return nn.length > 0 && nn.every(t => getV(t) >= t.target - EPS); };
export const todayOK = () => dayOK(state.tasks, val);

/* ================= Day rollover & streaks ================= */
export function commitTimer(endTs = Date.now()) {
  if (!state.timer) return;
  const { id, start } = state.timer;
  state.progress[id] = (state.progress[id] || 0) + Math.max(0, endTs - start) / 60000;
  state.timer = null;
}
export function rollover() {
  const today = todayKey();
  if (state.currentDay >= today) return false;
  const day = state.currentDay;
  // credit a running timer only up to midnight of the day it belonged to
  if (state.timer) commitTimer(Math.min(Date.now(), parseKey(addDays(day, 1)).getTime()));
  const getV = t => state.progress[t.id] || 0;
  state.history[day] = {
    ok: dayOK(state.tasks, getV),
    tasks: state.tasks.map(t => ({ name: t.name, emoji: t.emoji, type: t.type, target: t.target, unit: unitOf(t), nonneg: t.nonneg, value: Math.round(getV(t) * 100) / 100 })),
  };
  // days the app was never opened count as missed
  for (let d = addDays(day, 1); d < today; d = addDays(d, 1)) state.history[d] = { ok: false, missed: true, tasks: [] };
  state.currentDay = today;
  state.progress = {};
  updateLongest();
  save();
  return true;
}
export function pastStreak() {
  let n = 0, d = addDays(state.currentDay, -1);
  while (state.history[d] && state.history[d].ok) { n++; d = addDays(d, -1); }
  return n;
}
export const currentStreak = () => pastStreak() + (todayOK() ? 1 : 0);
export function updateLongest() { state.longest = Math.max(state.longest || 0, currentStreak()); }
export function longestFromHistory() {
  let best = 0, run = 0;
  for (let d = state.startDate; d < state.currentDay; d = addDays(d, 1)) {
    run = state.history[d] && state.history[d].ok ? run + 1 : 0;
    best = Math.max(best, run);
  }
  state.longest = Math.max(state.longest || 0, best);
}
export function stageOf(s) { let st = 0; THRESH.forEach((t, i) => { if (s >= t) st = i; }); return st; }
export function catMood(s) {
  if (todayOK()) return 'happy';
  const y = state.history[addDays(state.currentDay, -1)];
  if (s === 0 && y && !y.ok) return 'sad';
  if (s === 0) return 'sleep';
  return 'normal';
}

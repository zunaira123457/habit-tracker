'use strict';
// Behavioral question bank, daily picks (rotating themes), answer measurements and storage.
import { addDays, uid } from '../util.js';
import { prep, savePrep } from './state.js';

let bank = null;
const byId = new Map();
export async function loadBank() {
  if (bank) return bank;
  const res = await fetch('data/behavioral.json');
  if (!res.ok) throw new Error(`Couldn't load the behavioral questions (${res.status}).`);
  bank = await res.json();
  bank.questions.forEach(q => byId.set(q.id, q));
  return bank;
}
export const bankReady = () => !!bank;
export const questionOf = id => byId.get(id);
export const themeName = id => bank?.themes.find(t => t.id === id)?.name || id;
export const themes = () => bank?.themes || [];

export const attemptsOf = qid => prep.answers[qid] || [];
export const answerById = (qid, id) => attemptsOf(qid).find(a => a.id === id);
const lastAnswered = qid => attemptsOf(qid).reduce((d, a) => (a.date > d ? a.date : d), '');
const bestScore = qid => Math.max(0, ...attemptsOf(qid).map(a => a.feedback?.score || 0));

/**
 * Pick questions for a day: themes you've seen least recently come first, and within a theme
 * prefer questions never answered, then weak answers (score < 6) after 14 days, then anything
 * not answered in the last 60 days.
 */
function pick(date, n, taken) {
  const themeSeen = {}, assigned = {};
  for (const [d, day] of Object.entries(prep.days)) {
    if (d >= date) continue;
    for (const s of day.behavioral || []) {
      const t = questionOf(s.qid)?.theme;
      if (t && (!themeSeen[t] || d > themeSeen[t])) themeSeen[t] = d;
      if (!assigned[s.qid] || d > assigned[s.qid]) assigned[s.qid] = d;
    }
  }
  const lastSeen = qid => [lastAnswered(qid), assigned[qid] || ''].sort().pop();
  const takenThemes = new Set([...taken].map(id => questionOf(id)?.theme));
  const order = bank.themes.map((t, i) => ({ id: t.id, seen: themeSeen[t.id] || '', i }))
    .sort((a, b) => a.seen.localeCompare(b.seen) || a.i - b.i);
  const rank = q => {
    const answered = lastAnswered(q.id), seen = lastSeen(q.id);
    if (!seen) return 0;                                                       // never shown
    if (answered && bestScore(q.id) < 6 && answered <= addDays(date, -14)) return 1; // weak answer, retry
    if (seen <= addDays(date, -60)) return 2;                                  // not seen in two months
    if (!answered && seen <= addDays(date, -30)) return 2;                     // shown but skipped a month ago
    return 3;
  };
  const picked = [];
  for (const pass of [0, 1]) { // second pass allows repeating a theme if every theme is taken
    for (const t of order) {
      if (picked.length >= n) break;
      if (pass === 0 && takenThemes.has(t.id)) continue;
      const q = bank.questions.filter(x => x.theme === t.id && !taken.has(x.id))
        .sort((a, b) => rank(a) - rank(b) || lastSeen(a.id).localeCompare(lastSeen(b.id)))[0];
      if (q) { picked.push(q.id); taken.add(q.id); takenThemes.add(t.id); }
    }
  }
  return picked;
}

/** Today's 2 questions, created the first time they're needed. */
export function ensureBehavioral(date) {
  if (!bank) return null;
  const day = (prep.days[date] ??= { leetcode: [] });
  if (!day.behavioral) {
    day.behavioral = pick(date, 2, new Set()).map(qid => ({ qid, answerId: null, draft: '' }));
    savePrep();
  }
  return day.behavioral;
}
/** Replace an unanswered question with one from a different theme. */
export function swapQuestion(date, qid) {
  const slots = prep.days[date]?.behavioral; const i = slots?.findIndex(s => s.qid === qid);
  if (i == null || i < 0 || slots[i].answerId) return null;
  const [next] = pick(date, 1, new Set(slots.map(s => s.qid)));
  if (next) { slots[i] = { qid: next, answerId: null, draft: '' }; savePrep(); }
  return next || null;
}

/* ---------- measurements (computed here, then sent to the AI) ---------- */
const FILLERS = [
  ['um', /\b(?:um+|umm+|erm+)\b/gi],
  ['uh', /\b(?:uh+|er+)\b/gi],
  // "like" only when it isn't doing real work ("I'd like to", "looks like", "like this")
  ['like', /(?<!\b(?:would|i'd|you'd|we'd|they'd|looks|look|looked|seems|seemed|feel|felt|something|anything|nothing|things|just|be|is|was|more|much)\s)\blike\b(?!\s+(?:to|this|that|a|an|the|it|when|how)\b)/gi],
  ['you know', /\byou know\b(?!\s+(?:how|what|that|why|when|where|who))/gi],
  ['basically', /\bbasically\b/gi],
  ['actually', /\bactually\b/gi],
  ['literally', /\bliterally\b/gi],
  ['I mean', /\bi mean\b/gi],
  ['kind of', /\bkind of\b/gi],
  ['sort of', /\bsort of\b/gi],
];
export const WPM_TYPED = 150;
export function measure(text, mode, durationSec) {
  const words = (text.match(/[\w'’-]+/g) || []).length;
  const count = re => (text.match(re) || []).length;
  const iCount = count(/\b(?:i|i'm|i’m|i've|i’ve|i'd|i’d|i'll|i’ll|me|my|myself)\b/gi);
  const weCount = count(/\b(?:we|we're|we’re|we've|we’ve|we'd|we’d|we'll|we’ll|us|our|ours)\b/gi);
  const m = { words, iCount, weCount };
  if (mode === 'voice') {
    m.durationSec = Math.round(durationSec || 0);
    m.wpm = m.durationSec ? Math.round(words / (m.durationSec / 60)) : 0;
    m.fillers = {};
    for (const [name, re] of FILLERS) { const n = count(re); if (n) m.fillers[name] = n; }
    m.totalFillers = Object.values(m.fillers).reduce((a, b) => a + b, 0);
  } else {
    m.durationSec = Math.round(words / WPM_TYPED * 60);
  }
  return m;
}

/** Save an answer dated `date`. With `forPlan`, it also completes that question in the day's plan. */
export function saveAnswer({ qid, text, mode, durationSec, date, forPlan }) {
  const slot = forPlan ? prep.days[date]?.behavioral?.find(s => s.qid === qid) : null;
  const answer = {
    id: uid(), qid, date, mode, text,
    metrics: measure(text, mode, durationSec), feedback: null, feedbackError: null, starred: false, practice: !slot,
  };
  (prep.answers[qid] ??= []).push(answer);
  if (slot) { slot.answerId = answer.id; slot.draft = ''; slot.retry = false; }
  savePrep();
  return answer;
}

/* ---------- library stats ---------- */
export function libraryStats() {
  const all = Object.values(prep.answers).flat().filter(a => a.feedback).sort((a, b) => a.date.localeCompare(b.date));
  const avg = list => list.length ? list.reduce((s, a) => s + a.feedback.score, 0) / list.length : null;
  const byTheme = {};
  for (const a of all) (byTheme[questionOf(a.qid)?.theme] ??= []).push(a);
  const themeAvgs = Object.entries(byTheme).map(([t, list]) => ({ theme: t, avg: avg(list), n: list.length })).sort((a, b) => b.avg - a.avg);
  return {
    total: Object.values(prep.answers).flat().length,
    recentAvg: avg(all.slice(-10)),
    firstAvg: all.length > 10 ? avg(all.slice(0, 10)) : null,
    best: themeAvgs[0] || null,
    weakest: themeAvgs.length > 1 && themeAvgs.at(-1).avg < themeAvgs[0].avg ? themeAvgs.at(-1) : null,
  };
}

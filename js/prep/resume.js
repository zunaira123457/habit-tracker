'use strict';
// Resume deep dive: parsed resume, bullet practice history, and interview sessions.
import { uid } from '../util.js';
import { prep, savePrep } from './state.js';
import { askAI, postApi } from './ai.js';

export const SESSION_SIZE = 5;
export const MAX_FOLLOW_UPS = 2;

/** Stable id from the bullet text, so re-uploading an edited resume keeps history for unchanged bullets. */
function bulletId(text) {
  let h = 5381;
  for (const ch of text.trim().toLowerCase()) h = ((h << 5) + h + ch.codePointAt(0)) >>> 0;
  return `b${h.toString(36)}`;
}

export const resume = () => prep.resume?.sections ? prep.resume : null;
const store = () => (prep.resume ??= { practice: {}, sessions: [] });

/* ---------- upload & parse ---------- */
const toBase64 = file => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = () => reject(new Error("Couldn't read that file."));
  r.readAsDataURL(file);
});

export async function parseResume({ file, text }) {
  if (file && file.size > 3 * 1024 * 1024) throw new Error('That file is larger than 3 MB.');
  if (file && !/\.(pdf|docx)$/i.test(file.name)) throw new Error('Upload a PDF or DOCX file, or paste the text instead.');
  const body = file ? { fileName: file.name, data: await toBase64(file) } : { text };
  const parsed = await postApi('/api/parse-resume', body);
  const withIds = list => list.map(e => ({ ...e, id: uid(), bullets: e.bullets.filter(b => b.trim()).map(t => ({ id: bulletId(t), text: t.trim() })) }));
  const r = store();
  r.name = parsed.name || '';
  r.fileName = file?.name || 'Pasted text';
  r.uploadedAt = new Date().toISOString();
  r.sections = { experience: withIds(parsed.experience), projects: withIds(parsed.projects), skills: parsed.skills, education: parsed.education };
  r.activeSessionId = null;
  savePrep();
  return r;
}
export function removeResume() {
  const r = store();
  delete r.sections; r.activeSessionId = null;
  savePrep();
}

/* ---------- bullets ---------- */
export function allBullets() {
  const r = resume(); if (!r) return [];
  return [
    ...r.sections.experience.flatMap(e => e.bullets.map(b => ({ ...b, section: 'experience', context: [e.title, e.organization].filter(Boolean).join(' · ') }))),
    ...r.sections.projects.flatMap(p => p.bullets.map(b => ({ ...b, section: 'projects', context: [p.name, p.details].filter(Boolean).join(' · ') }))),
  ];
}
export const bulletById = id => allBullets().find(b => b.id === id);
export const practiceOf = id => store().practice[id] || null;
const PRIORITY = { weak: 1, okay: 2, strong: 3 };
/** Suggested bullets: never practiced first, then weak, then okay, oldest practice first. */
export function suggestBullets(n = SESSION_SIZE) {
  return [...allBullets()].sort((a, b) => {
    const pa = practiceOf(a.id), pb = practiceOf(b.id);
    return (pa ? PRIORITY[pa.lastRating] ?? 2 : 0) - (pb ? PRIORITY[pb.lastRating] ?? 2 : 0) || (pa?.lastDate || '').localeCompare(pb?.lastDate || '');
  }).slice(0, n).map(b => b.id);
}

/* ---------- sessions ---------- */
export const sessions = () => store().sessions;
export const activeSession = () => sessions().find(s => s.id === store().activeSessionId && s.status !== 'done') || null;
export const sessionById = id => sessions().find(s => s.id === id);

export function startSession(bulletIds, date) {
  const s = { id: uid(), date, bulletIds, index: 0, turns: {}, assessments: {}, summary: null, status: 'active', error: null };
  store().sessions.push(s);
  store().activeSessionId = s.id;
  savePrep();
  return s;
}

const currentBullet = s => bulletById(s.bulletIds[s.index]);

/** Ask the interviewer for the next step: an opening question, a follow-up, or an assessment. */
export async function advance(s) {
  s.error = null;
  while (s.index < s.bulletIds.length) {
    const bid = s.bulletIds[s.index];
    const bullet = currentBullet(s);
    if (!bullet) { s.assessments[bid] = { rating: 'skipped', note: 'This bullet is no longer on your resume.' }; s.index++; continue; }
    const turns = (s.turns[bid] ??= []);
    if (turns.length && !turns.at(-1).answer) return; // waiting for the user's answer
    const r = await askAI('resume-turn', {
      bullet: { text: bullet.text, section: bullet.section, context: bullet.context },
      turns: turns.map(t => ({ question: t.question, answer: t.answer })),
      skills: resume().sections.skills, maxFollowUps: MAX_FOLLOW_UPS,
    });
    if (!r.done) { turns.push({ question: r.question, answer: '' }); savePrep(); return; }
    s.assessments[bid] = r.assessment;
    const p = (store().practice[bid] ??= { count: 0 });
    Object.assign(p, { count: p.count + 1, lastRating: r.assessment.rating, lastDate: s.date });
    s.index++;
    savePrep();
  }
  await finish(s);
}

export async function answer(s, text, mode, durationSec) {
  const turns = s.turns[s.bulletIds[s.index]];
  const last = turns?.at(-1);
  if (!last || last.answer) return;
  Object.assign(last, { answer: text, mode, durationSec: Math.round(durationSec || 0) });
  savePrep();
  await advance(s);
}

export async function skipBullet(s) {
  const bid = s.bulletIds[s.index];
  s.assessments[bid] = { rating: 'skipped', note: '' };
  s.index++;
  savePrep();
  await advance(s);
}

/** End the session (early or after the last bullet) and get the debrief. */
export async function finish(s) {
  if (s.status === 'done') return;
  s.index = Math.min(s.index, s.bulletIds.length);
  // Ending mid-bullet: assess what was answered so far instead of dropping it.
  const bid = s.bulletIds[s.index], bullet = bid && bulletById(bid);
  const answered = (s.turns[bid] || []).filter(t => t.answer);
  if (bullet && !s.assessments[bid] && answered.length) {
    s.turns[bid] = answered;
    const r = await askAI('resume-turn', {
      bullet: { text: bullet.text, section: bullet.section, context: bullet.context },
      turns: answered.map(t => ({ question: t.question, answer: t.answer })),
      skills: resume().sections.skills, maxFollowUps: Math.max(0, answered.length - 1),
    });
    s.assessments[bid] = r.assessment;
    const p = (store().practice[bid] ??= { count: 0 });
    Object.assign(p, { count: p.count + 1, lastRating: r.assessment.rating, lastDate: s.date });
  }
  const items = s.bulletIds.filter(bid => s.assessments[bid]?.rating && s.assessments[bid].rating !== 'skipped')
    .map(bid => ({ text: bulletById(bid)?.text || '', turns: (s.turns[bid] || []).filter(t => t.answer), assessment: s.assessments[bid] }));
  s.status = 'summarizing'; savePrep();
  if (items.length) s.summary = await askAI('resume-summary', { items });
  s.status = 'done';
  store().activeSessionId = null;
  savePrep();
}

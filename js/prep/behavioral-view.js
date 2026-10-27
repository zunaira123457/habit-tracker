'use strict';
// Behavioral practice UI: today's 2 questions, the type/speak composer, AI feedback, and the story library.
import { $, $$, esc, ic, pad } from '../util.js';
import { state } from '../store.js';
import { toast, openOverlay, closeOverlay } from '../ui.js';
import { prep, savePrep } from './state.js';
import {
  ensureBehavioral, swapQuestion, questionOf, themeName, themes, attemptsOf, answerById,
  measure, saveAnswer, libraryStats, bankReady,
} from './behavioral.js';
import { speechSupported, startRecording } from './voice.js';
import { askAI } from './ai.js';
import { renderMarkdown } from './markdown.js';

const today = () => state.currentDay;
const changed = () => document.dispatchEvent(new CustomEvent('prep:changed'));
const mmss = s => `${Math.floor(s / 60)}:${pad(Math.round(s) % 60)}`;
const RUBRIC = { star: 'STAR structure', specificity: 'Specificity', impact: 'Your impact ("I" vs "we")', results: 'Measurable results', length: 'Length' };
const MIN_WORDS = 20;

const composers = new Map();   // key → { qid, forPlan, mode, text, durationSec, recorder, recording, error }
const pending = new Set();     // answer ids waiting for feedback
let libFilter = 'all';
let drawerQid = null;

/* ================= Composer (type or speak) ================= */
function composer(key, qid, forPlan) {
  if (!composers.has(key)) {
    const slot = forPlan ? prep.days[today()]?.behavioral?.find(s => s.qid === qid) : null;
    composers.set(key, { qid, forPlan, mode: slot?.draftMode || 'type', text: slot?.draft || '', durationSec: 0, recorder: null, recording: false, error: '' });
  }
  return composers.get(key);
}

function lengthStatus(sec) {
  if (sec < 90) return { cls: 'short', text: 'aim for 1:30–2:30' };
  if (sec > 150) return { cls: 'long', text: 'a bit long, aim for 1:30–2:30' };
  return { cls: 'good', text: 'good length' };
}
export function metricsLine(m, mode) {
  const len = lengthStatus(m.durationSec);
  const parts = [
    `${m.words} words`,
    `<span class="len-${len.cls}">${mode === 'voice' ? '' : '~'}${mmss(m.durationSec)} ${mode === 'voice' ? 'spoken' : 'when spoken'} (${len.text})</span>`,
    `“I” ×${m.iCount} · “we” ×${m.weCount}`,
  ];
  if (mode === 'voice') parts.push(`${m.wpm} wpm`, `${m.totalFillers} filler${m.totalFillers === 1 ? '' : 's'}`);
  return parts.join('<span class="dot-sep">·</span>');
}

function composerHTML(key) {
  const c = composers.get(key);
  const voiceOK = speechSupported();
  const tabs = `<div class="seg seg-sm" role="group" aria-label="Answer mode">
      <button type="button" data-bact="mode" data-mode="type" aria-pressed="${c.mode === 'type'}">${ic('edit')}Type</button>
      <button type="button" data-bact="mode" data-mode="voice" aria-pressed="${c.mode === 'voice'}">${ic('mic')}Speak</button>
    </div>`;
  let body;
  if (c.mode === 'type') {
    body = `<textarea class="input answer-box" data-binput="text" rows="8" placeholder="Situation → Task → Action → Result. Use one real example and say what *you* did." aria-label="Your answer">${esc(c.text)}</textarea>`;
  } else if (!voiceOK) {
    body = `<div class="note">Voice answers need speech recognition, which this browser doesn't support. Try Chrome, Edge or Safari, or type your answer.</div>`;
  } else if (c.recording) {
    body = `<div class="recording"><span class="rec-dot" aria-hidden="true"></span><span class="rec-time" data-rec-time>${mmss(c.recorder?.elapsed() || 0)}</span>
        <button type="button" class="btn btn-secondary btn-sm" data-bact="stop">${ic('stop')}Stop</button></div>
      <div class="transcript live" aria-live="polite">${esc(c.text) || '<span class="muted">Listening… start speaking.</span>'}</div>`;
  } else if (c.text) {
    body = `<label class="field-label" for="t-${esc(key)}">Transcript <em>(fix any words that were misheard)</em></label>
      <textarea class="input answer-box" id="t-${esc(key)}" data-binput="text" rows="7">${esc(c.text)}</textarea>
      <div class="rec-again"><button type="button" class="btn-link" data-bact="record">${ic('mic')}Record again</button><span class="muted">Recorded ${mmss(c.durationSec)}</span></div>`;
  } else {
    body = `<div class="record-start"><button type="button" class="btn btn-secondary" data-bact="record">${ic('mic')}Start recording</button>
      <p class="muted">Aim for 1.5–2.5 minutes. Your browser transcribes it (Chrome sends audio to Google); no audio is saved.</p></div>`;
  }
  const m = c.text ? measure(c.text, c.mode, c.durationSec) : null;
  const canSubmit = !c.recording && m && m.words >= MIN_WORDS && (c.mode === 'type' || voiceOK);
  return `<div class="composer" data-key="${esc(key)}">
    ${tabs}
    ${body}
    ${c.error ? `<div class="err" role="alert">${esc(c.error)}</div>` : ''}
    <div class="composer-foot">
      <div class="metrics" data-metrics>${m ? metricsLine(m, c.mode) : `<span class="muted">At least ${MIN_WORDS} words to get feedback</span>`}</div>
      <button type="button" class="btn btn-primary btn-sm" data-bact="submit" ${canSubmit ? '' : 'disabled'}>Save &amp; get feedback</button>
    </div>
  </div>`;
}
function rerenderComposer(key) {
  const el = $(`.composer[data-key="${CSS.escape(key)}"]`);
  if (el) el.outerHTML = composerHTML(key);
}

/* ================= Feedback ================= */
const scoreClass = s => (s >= 8 ? 'hi' : s >= 6 ? 'mid' : 'lo');
export function feedbackHTML(a) {
  if (pending.has(a.id)) return `<div class="fb fb-loading"><span class="spinner" aria-hidden="true"></span>Getting feedback…</div>`;
  if (!a.feedback) {
    return `<div class="fb fb-error"><span>${esc(a.feedbackError || 'No feedback yet.')}</span>
      <button type="button" class="btn btn-secondary btn-sm" data-bact="refb" data-qid="${esc(a.qid)}" data-aid="${a.id}">Get feedback</button></div>`;
  }
  const f = a.feedback;
  return `<div class="fb">
    <div class="fb-head">
      <div class="score score-${scoreClass(f.score)}" aria-label="Score ${f.score} out of 10"><b>${f.score}</b><span>/10</span></div>
      <p class="fb-summary">${esc(f.summary)}</p>
    </div>
    <ul class="rubric">${Object.entries(RUBRIC).map(([k, label]) => `
      <li><span class="rb-name">${label}</span><span class="rb-rating ${f.rubric[k].rating}">${f.rubric[k].rating}</span><span class="rb-note">${esc(f.rubric[k].note)}</span></li>`).join('')}</ul>
    ${f.improvements.length ? `<div class="fb-sec"><h4>What to improve</h4><ol>${f.improvements.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
    ${a.mode === 'voice' && f.delivery ? `<div class="fb-sec"><h4>Delivery</h4><p><b>Filler words:</b> ${esc(f.delivery.fillers)}</p><p><b>Pacing:</b> ${esc(f.delivery.pacing)}</p></div>` : ''}
    ${f.rewrite ? `<details class="fb-sec rewrite"><summary>Stronger version of your answer</summary>
      <div class="md">${renderMarkdown(f.rewrite)}</div>
      ${f.missingDetails.length ? `<p class="muted">Fill in the [brackets] with your real details: ${f.missingDetails.map(esc).join(', ')}.</p>` : ''}
      <button type="button" class="btn btn-secondary btn-sm" data-bact="copy" data-qid="${esc(a.qid)}" data-aid="${a.id}">${ic('copy')}Copy</button>
    </details>` : ''}
    <div class="fb-foot"><span class="metrics">${metricsLine(a.metrics, a.mode)}</span>
      <button type="button" class="btn-link star-btn ${a.starred ? 'on' : ''}" data-bact="star" data-qid="${esc(a.qid)}" data-aid="${a.id}" aria-pressed="${a.starred}">${ic('star')}${a.starred ? 'In best stories' : 'Add to best stories'}</button></div>
  </div>`;
}

async function requestFeedback(a) {
  const q = questionOf(a.qid); if (!q || pending.has(a.id)) return;
  pending.add(a.id); refreshAnswer(a);
  try {
    a.feedback = await askAI('behavioral-feedback', { question: q.text, theme: themeName(q.theme), answer: a.text, mode: a.mode, metrics: a.metrics });
    a.feedbackError = null;
    toast(`Feedback ready: ${a.feedback.score}/10`, 'success');
  } catch (err) {
    a.feedbackError = err.message;
    toast(err.message);
  } finally {
    pending.delete(a.id); savePrep(); refreshAnswer(a);
  }
}
function refreshAnswer(a) {
  renderBehavioralToday();
  if (drawerQid === a.qid) renderDrawerBody();
  if ($('#bq-library')?.offsetParent) renderLibrary();
}

/* ================= Today's questions ================= */
function questionCard(slot) {
  const q = questionOf(slot.qid); if (!q) return '';
  const key = `day:${slot.qid}`;
  const answer = slot.answerId ? answerById(slot.qid, slot.answerId) : null;
  const tries = attemptsOf(slot.qid).length;
  let body;
  if (answer && !slot.retry) {
    body = `<details class="your-answer"><summary>Your answer${answer.mode === 'voice' ? ' (spoken)' : ''}</summary><p>${esc(answer.text)}</p></details>
      ${feedbackHTML(answer)}
      <div class="card-foot"><button type="button" class="btn-link" data-bact="retry">${ic('refresh')}Answer again</button>
        ${tries > 1 ? `<button type="button" class="btn-link" data-bact="view-q">See all ${tries} attempts</button>` : ''}</div>`;
  } else {
    composer(key, slot.qid, true);
    body = composerHTML(key) + (slot.retry ? `<div class="card-foot"><button type="button" class="btn-link" data-bact="cancel-retry">Cancel</button></div>` : '');
  }
  return `<article class="bq ${answer ? 'is-done' : ''}" data-qid="${esc(slot.qid)}">
    <div class="bq-head">
      <span class="theme-tag">${esc(themeName(q.theme))}</span>
      ${answer ? `<span class="done-tag">${ic('check')}Answered</span>` : `<button type="button" class="btn-link" data-bact="swap" title="Get a question from another theme">${ic('refresh')}Swap question</button>`}
    </div>
    <h3 class="bq-text">${esc(q.text)}</h3>
    ${tries && !answer ? `<p class="muted bq-prev">You've answered this ${tries} time${tries > 1 ? 's' : ''} before. <button type="button" class="btn-link" data-bact="view-q">See past attempts</button></p>` : ''}
    ${body}
  </article>`;
}
export function renderBehavioralToday() {
  const list = $('#bq-list'); if (!list) return;
  const slots = ensureBehavioral(today());
  if (!slots) { list.innerHTML = '<div class="empty"><span>Loading questions…</span></div>'; return; }
  const done = slots.filter(s => s.answerId).length;
  $('#bq-count').textContent = `${done}/${slots.length}`;
  $('#bq-count').classList.toggle('all', slots.length > 0 && done === slots.length);
  list.innerHTML = slots.map(questionCard).join('');
}

/* ================= Library ================= */
export function renderLibrary() {
  const box = $('#bq-library'); if (!box || !bankReady()) return;
  const st = libraryStats();
  const answered = Object.keys(prep.answers).filter(qid => attemptsOf(qid).length && questionOf(qid));
  const starred = answered.flatMap(qid => attemptsOf(qid).filter(a => a.starred));
  const themeIds = [...new Set(answered.map(qid => questionOf(qid).theme))];
  const shown = answered
    .filter(qid => libFilter === 'all' || (libFilter === 'starred' ? attemptsOf(qid).some(a => a.starred) : questionOf(qid).theme === libFilter))
    .sort((a, b) => attemptsOf(b).at(-1).date.localeCompare(attemptsOf(a).at(-1).date));
  const fmtAvg = v => (v == null ? '—' : v.toFixed(1));
  if (!answered.length) {
    box.innerHTML = `<div class="panel"><div class="empty"><div class="empty-ic">📚</div><b>No answers yet</b><span>Answer today's behavioral questions and they'll show up here, with every attempt and its feedback.</span><button class="btn btn-secondary btn-sm" data-ptab="today">Go to today's questions</button></div></div>`;
    return;
  }
  box.innerHTML = `
    <div class="stats wide panel">
      <div class="stat"><span class="stat-label">${ic('mic')}Answers</span><b>${st.total}</b></div>
      <div class="stat"><span class="stat-label">${ic('chart')}Avg score (last 10)</span><b>${fmtAvg(st.recentAvg)}</b>${st.firstAvg != null ? `<span class="stat-sub">first 10: ${fmtAvg(st.firstAvg)}</span>` : ''}</div>
      <div class="stat"><span class="stat-label">${ic('trophy')}Strongest theme</span><b class="stat-text">${st.best ? esc(themeName(st.best.theme)) : '—'}</b></div>
      <div class="stat"><span class="stat-label">${ic('flag')}Needs work</span><b class="stat-text">${st.weakest ? esc(themeName(st.weakest.theme)) : '—'}</b></div>
    </div>
    ${starred.length ? `<section class="panel"><div class="panel-head"><h2>${ic('star')}Best stories</h2><span class="count">${starred.length}</span></div>
      <ul class="story-list">${starred.map(a => `<li><button type="button" class="story" data-bact="view-q" data-qid="${esc(a.qid)}">
        <span class="theme-tag">${esc(themeName(questionOf(a.qid).theme))}</span>
        <span class="story-q">${esc(questionOf(a.qid).text)}</span>
        <span class="story-snip">${esc(a.text.slice(0, 160))}${a.text.length > 160 ? '…' : ''}</span>
        ${a.feedback ? `<span class="score score-sm score-${scoreClass(a.feedback.score)}"><b>${a.feedback.score}</b></span>` : ''}</button></li>`).join('')}</ul></section>` : ''}
    <section class="panel">
      <div class="panel-head"><h2>All answered questions</h2></div>
      <div class="chips" role="group" aria-label="Filter">
        ${[['all', 'All'], ['starred', 'Starred'], ...themeIds.map(t => [t, themeName(t)])].map(([id, label]) => `<button type="button" class="chip" data-bact="lib-filter" data-filter="${esc(id)}" aria-pressed="${libFilter === id}">${esc(label)}</button>`).join('')}
      </div>
      <ul class="lib-list">${shown.map(qid => {
        const tries = attemptsOf(qid), scores = tries.filter(a => a.feedback).map(a => a.feedback.score);
        return `<li class="lib-row">
          <div class="lib-main"><span class="theme-tag">${esc(themeName(questionOf(qid).theme))}</span><span class="lib-q">${esc(questionOf(qid).text)}</span>
            <span class="lib-meta">${tries.length} attempt${tries.length > 1 ? 's' : ''}${scores.length ? ` · scores ${scores.join(' → ')}` : ''}</span></div>
          <div class="lib-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-bact="view-q" data-qid="${esc(qid)}">View</button>
            <button type="button" class="btn btn-secondary btn-sm" data-bact="practice" data-qid="${esc(qid)}">Practice</button>
          </div></li>`;
      }).join('') || '<li class="empty"><span>Nothing matches this filter.</span></li>'}</ul>
    </section>`;
}

/* ================= Question drawer & practice modal ================= */
function renderDrawerBody() {
  const body = $('#qdrawer-body'); if (!body || !drawerQid) return;
  const tries = [...attemptsOf(drawerQid)].reverse();
  body.innerHTML = tries.map((a, i) => `
    <details class="attempt" ${i === 0 ? 'open' : ''}>
      <summary><span>${new Date(a.date + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span class="muted">${a.mode === 'voice' ? 'Spoken' : 'Typed'}${a.practice ? ' · extra practice' : ''}</span>
        ${a.feedback ? `<span class="score score-sm score-${scoreClass(a.feedback.score)}"><b>${a.feedback.score}</b></span>` : ''}${a.starred ? ic('star') : ''}</summary>
      <div class="attempt-body"><p class="attempt-text">${esc(a.text)}</p>${feedbackHTML(a)}</div>
    </details>`).join('') || '<p class="d-note">No attempts yet.</p>';
}
function openQuestionDrawer(qid) {
  const q = questionOf(qid); if (!q) return;
  drawerQid = qid;
  openOverlay('drawer', `
    <div class="sheet-handle" aria-hidden="true"></div>
    <header class="ov-head"><div><h2 id="ov-title">${esc(q.text)}</h2><div class="ov-sub"><span class="theme-tag">${esc(themeName(q.theme))}</span></div></div>
      <button class="icon-btn" data-close aria-label="Close">${ic('x')}</button></header>
    <div class="ov-body" id="qdrawer-body"></div>
    <footer class="ov-foot"><button class="btn btn-secondary" data-bact="practice" data-qid="${esc(qid)}">${ic('refresh')}Practice again</button></footer>`,
  () => { drawerQid = null; });
  renderDrawerBody();
}
function openPractice(qid) {
  const q = questionOf(qid); if (!q) return;
  const key = `extra:${qid}`;
  composers.delete(key);
  composer(key, qid, false);
  openOverlay('modal', `
    <div class="sheet-handle" aria-hidden="true"></div>
    <header class="ov-head"><div><h2 id="ov-title">${esc(q.text)}</h2><div class="ov-sub"><span class="theme-tag">${esc(themeName(q.theme))}</span><span class="muted">Extra practice, doesn't change today's plan</span></div></div>
      <button class="icon-btn" data-close aria-label="Close">${ic('x')}</button></header>
    <div class="ov-body">${composerHTML(key)}</div>`,
  () => { const c = composers.get(key); c?.recorder?.stop(); composers.delete(key); });
}

/* ================= Events ================= */
function stopOtherRecordings(except) {
  for (const [k, c] of composers) if (k !== except && c.recording) { c.recorder?.stop(); }
}
let recTick = null;
function startRec(key) {
  const c = composers.get(key);
  stopOtherRecordings(key);
  c.text = ''; c.error = ''; c.recording = true; c.mode = 'voice';
  c.recorder = startRecording({
    onText: t => { c.text = t; const el = $(`.composer[data-key="${CSS.escape(key)}"] .transcript`); if (el) el.textContent = t; },
    onStop: ({ text, durationSec }) => { c.recording = false; c.text = text; c.durationSec = durationSec; clearInterval(recTick); saveDraft(key); rerenderComposer(key); },
    onError: msg => { c.recording = false; c.error = msg; clearInterval(recTick); rerenderComposer(key); },
  });
  rerenderComposer(key);
  clearInterval(recTick);
  recTick = setInterval(() => { const el = $(`.composer[data-key="${CSS.escape(key)}"] [data-rec-time]`); if (el && c.recorder) el.textContent = mmss(c.recorder.elapsed()); }, 500);
}
function saveDraft(key) {
  const c = composers.get(key); if (!c?.forPlan) return;
  const slot = prep.days[today()]?.behavioral?.find(s => s.qid === c.qid);
  if (slot) { slot.draft = c.text; slot.draftMode = c.mode; savePrep(); }
}
async function submit(key) {
  const c = composers.get(key); if (!c || c.recording) return;
  const text = c.text.trim();
  if ((text.match(/[\w'’-]+/g) || []).length < MIN_WORDS) { toast(`Write at least ${MIN_WORDS} words first.`); return; }
  const a = saveAnswer({ qid: c.qid, text, mode: c.mode, durationSec: c.durationSec, date: today(), forPlan: c.forPlan });
  composers.delete(key);
  if (c.forPlan) { renderBehavioralToday(); changed(); }
  else { closeOverlay(); openQuestionDrawer(c.qid); }
  await requestFeedback(a);
}

function onClick(e) {
  const b = e.target.closest('[data-bact]'); if (!b) return;
  const act = b.dataset.bact;
  const key = b.closest('.composer')?.dataset.key;
  const cardQid = b.closest('.bq')?.dataset.qid;
  const qid = b.dataset.qid || cardQid;
  if (act === 'mode') { const c = composers.get(key); if (c && !c.recording) { c.mode = b.dataset.mode; c.error = ''; if (c.mode === 'voice' && c.durationSec === 0) c.text = ''; saveDraft(key); rerenderComposer(key); } }
  else if (act === 'record') startRec(key);
  else if (act === 'stop') composers.get(key)?.recorder?.stop();
  else if (act === 'submit') submit(key);
  else if (act === 'swap') { const next = swapQuestion(today(), qid); composers.delete(`day:${qid}`); renderBehavioralToday(); changed(); if (next) toast(`New question: ${themeName(questionOf(next).theme)}`); }
  else if (act === 'retry' || act === 'cancel-retry') {
    const slot = prep.days[today()]?.behavioral?.find(s => s.qid === qid);
    if (slot) { slot.retry = act === 'retry'; composers.delete(`day:${qid}`); savePrep(); renderBehavioralToday(); }
  }
  else if (act === 'refb') { const a = answerById(qid, b.dataset.aid); if (a) requestFeedback(a); }
  else if (act === 'star') {
    const a = answerById(qid, b.dataset.aid);
    if (a) { a.starred = !a.starred; savePrep(); refreshAnswer(a); toast(a.starred ? 'Added to best stories' : 'Removed from best stories', 'success'); }
  }
  else if (act === 'copy') {
    const a = answerById(qid, b.dataset.aid);
    navigator.clipboard?.writeText(a?.feedback?.rewrite || '').then(() => toast('Copied', 'success'), () => toast("Couldn't copy"));
  }
  else if (act === 'view-q') openQuestionDrawer(qid);
  else if (act === 'practice') { closeOverlay(true); openPractice(qid); }
  else if (act === 'lib-filter') { libFilter = b.dataset.filter; renderLibrary(); }
}
function onInput(e) {
  if (e.target.dataset.binput !== 'text') return;
  const key = e.target.closest('.composer')?.dataset.key; const c = composers.get(key); if (!c) return;
  c.text = e.target.value.slice(0, 12000);
  const m = measure(c.text, c.mode, c.durationSec);
  const box = e.target.closest('.composer');
  box.querySelector('[data-metrics]').innerHTML = c.text.trim() ? metricsLine(m, c.mode) : `<span class="muted">At least ${MIN_WORDS} words to get feedback</span>`;
  box.querySelector('[data-bact="submit"]').disabled = m.words < MIN_WORDS;
  clearTimeout(c.draftTimer); c.draftTimer = setTimeout(() => saveDraft(key), 400);
}
export function initBehavioral() {
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
}
export { themes };

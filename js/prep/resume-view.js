'use strict';
// Resume deep dive UI: upload, the parsed resume with practice status, the live interview, and the debrief.
import { $, $$, esc, ic, pad } from '../util.js';
import { state } from '../store.js';
import { toast, confirmModal, openOverlay, closeOverlay } from '../ui.js';
import {
  resume, parseResume, removeResume, allBullets, bulletById, practiceOf, suggestBullets, sessions, activeSession,
  sessionById, startSession, advance, answer, skipBullet, finish, SESSION_SIZE, MAX_FOLLOW_UPS,
} from './resume.js';
import { speechSupported, startRecording } from './voice.js';

const today = () => state.currentDay;
const mmss = s => `${Math.floor(s / 60)}:${pad(Math.round(s) % 60)}`;
const RATING = { strong: ['Explained well', 'ok'], okay: ['Needs practice', 'mid'], weak: ['Struggled', 'warn'], skipped: ['Skipped', 'muted'] };

let selected = null;       // Set of bullet ids chosen for the next session
let busy = false;          // waiting on the AI
let uploadBusy = false;
let draft = { text: '', mode: 'type', durationSec: 0 };
let recorder = null, recording = false, recTick = null;

/* ================= Entry ================= */
export function renderResume() {
  const box = $('#resume-pane'); if (!box) return;
  const s = activeSession();
  if (!resume()) box.innerHTML = uploadHTML();
  else if (s) box.innerHTML = sessionHTML(s);
  else box.innerHTML = overviewHTML();
  if (s) scrollChat();
}

/* ================= Upload ================= */
function uploadHTML() {
  return `<div class="resume-upload panel">
    <div class="empty">
      <div class="empty-ic" aria-hidden="true">📄</div>
      <b>Practice explaining your resume</b>
      <span>Upload your resume and an AI interviewer will dig into each bullet point with questions like "Why did you choose X over Y?" and "How did you measure that?", then follow up on your answers.</span>
      <label class="btn btn-primary drop-btn ${uploadBusy ? 'is-busy' : ''}">
        ${uploadBusy ? '<span class="spinner" aria-hidden="true"></span>Reading your resume…' : `${ic('plus')}Upload PDF or DOCX`}
        <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-ract="file" class="sr-only" ${uploadBusy ? 'disabled' : ''}>
      </label>
      <div class="drop-zone" data-ract="drop">or drop the file here</div>
      <details class="paste-resume"><summary>Paste the text instead</summary>
        <textarea class="input answer-box" id="resume-text" rows="8" placeholder="Paste your resume here, with one bullet point per line."></textarea>
        <button class="btn btn-secondary btn-sm" data-ract="paste" ${uploadBusy ? 'disabled' : ''}>Use this text</button>
      </details>
      <p class="muted privacy">Your resume is sent to the AI once to split it into sections. Only the sections are saved, in this browser. The file itself isn't stored anywhere.</p>
    </div>
  </div>`;
}
async function upload(input) {
  if (uploadBusy) return;
  uploadBusy = true; renderResume();
  try {
    const r = await parseResume(input);
    selected = null;
    toast(`Found ${allBullets().length} bullet points in ${r.fileName}`, 'success');
  } catch (err) { toast(err.message); }
  finally { uploadBusy = false; renderResume(); }
}

/* ================= Overview ================= */
function statusChip(id) {
  const p = practiceOf(id);
  if (!p) return '<span class="chip-static">Not practiced</span>';
  const [label, cls] = RATING[p.lastRating] || RATING.okay;
  return `<span class="rating-chip r-${cls}">${label}</span>`;
}
function bulletRow(b) {
  const on = selected.has(b.id);
  return `<li class="bullet-row ${on ? 'on' : ''}"><label>
    <input type="checkbox" data-ract="toggle" data-id="${b.id}" ${on ? 'checked' : ''}>
    <span class="bullet-text">${esc(b.text)}</span>${statusChip(b.id)}</label></li>`;
}
function overviewHTML() {
  const r = resume();
  selected ??= new Set(suggestBullets());
  const entry = (heading, sub, bullets) => `<div class="resume-entry"><div class="entry-head"><b>${esc(heading)}</b>${sub ? `<span class="muted">${esc(sub)}</span>` : ''}</div>
      <ul class="bullet-list">${bullets.map(b => bulletRow({ ...b })).join('') || '<li class="muted">No bullet points</li>'}</ul></div>`;
  const done = sessions().filter(s => s.status === 'done').slice(-6).reverse();
  return `<div class="prep-grid">
    <div class="prep-main">
      <section class="panel">
        <div class="panel-head"><div><h2>${esc(r.name || 'Your resume')}</h2><p>${esc(r.fileName)} · ${allBullets().length} bullets</p></div>
          <button class="btn-link" data-ract="replace">${ic('refresh')}Replace resume</button></div>
        <div class="resume-body">
          ${r.sections.experience.length ? `<h3 class="sec-label">Experience</h3>${r.sections.experience.map(e => entry(e.title, [e.organization, e.dates].filter(Boolean).join(' · '), e.bullets)).join('')}` : ''}
          ${r.sections.projects.length ? `<h3 class="sec-label">Projects</h3>${r.sections.projects.map(p => entry(p.name, p.details, p.bullets)).join('')}` : ''}
          ${r.sections.skills.length ? `<h3 class="sec-label">Skills</h3><div class="skill-chips">${r.sections.skills.map(s => `<span class="chip-static">${esc(s)}</span>`).join('')}</div>` : ''}
          ${r.sections.education.length ? `<h3 class="sec-label">Education</h3>${r.sections.education.map(e => `<div class="resume-entry"><div class="entry-head"><b>${esc(e.school)}</b><span class="muted">${esc([e.degree, e.dates].filter(Boolean).join(' · '))}</span></div></div>`).join('')}` : ''}
        </div>
      </section>
    </div>
    <aside class="prep-side">
      <section class="panel">
        <div class="panel-head"><h2>Start a deep dive</h2><span class="count" id="resume-selected">${selected.size} selected</span></div>
        <div class="panel-body session-setup">
          <p class="muted">The interviewer asks about each selected bullet and follows up up to ${MAX_FOLLOW_UPS} times. Pick about ${SESSION_SIZE} for a 15–20 minute session.</p>
          <div class="chips">
            <button class="chip" data-ract="pick-suggested">Suggested</button>
            <button class="chip" data-ract="pick-weak">Needs work</button>
            <button class="chip" data-ract="pick-none">Clear</button>
          </div>
          <button class="btn btn-primary" data-ract="start" ${selected.size ? '' : 'disabled'}>${ic('mic')}Start interview</button>
        </div>
      </section>
      ${done.length ? `<section class="panel"><div class="panel-head"><h2>Past sessions</h2></div>
        <ul class="past-list">${done.map(s => {
          const rated = s.bulletIds.map(id => s.assessments[id]?.rating).filter(x => x && x !== 'skipped');
          return `<li><button class="past" data-ract="view-session" data-id="${s.id}"><span>${new Date(s.date + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            <span class="muted">${rated.length} bullet${rated.length === 1 ? '' : 's'}</span>
            <span class="dots">${rated.map(x => `<i class="dot r-${RATING[x][1]}" title="${RATING[x][0]}"></i>`).join('')}</span></button></li>`;
        }).join('')}</ul></section>` : ''}
    </aside>
  </div>`;
}

/* ================= Live session ================= */
function chatHTML(s) {
  const bid = s.bulletIds[s.index];
  const turns = s.turns[bid] || [];
  return turns.map(t => `<div class="msg ai"><span class="who">Interviewer</span><p>${esc(t.question)}</p></div>${t.answer ? `<div class="msg me"><span class="who">You${t.mode === 'voice' ? ` · spoken ${mmss(t.durationSec || 0)}` : ''}</span><p>${esc(t.answer)}</p></div>` : ''}`).join('')
    + (busy ? '<div class="msg ai typing"><span class="spinner" aria-hidden="true"></span>Thinking of the next question…</div>' : '');
}
function composerHTML(waiting) {
  if (!waiting) return '';
  const voice = speechSupported();
  return `<div class="resume-composer">
    ${recording ? `<div class="recording"><span class="rec-dot" aria-hidden="true"></span><span class="rec-time" data-rtime>${mmss(recorder?.elapsed() || 0)}</span><span class="muted">Listening…</span></div>` : ''}
    <textarea class="input answer-box" id="resume-answer" rows="4" placeholder="${recording ? 'Speak now. Your words appear here.' : 'Answer like you would out loud. Ctrl/⌘ + Enter to send.'}" ${recording ? 'readonly' : ''}>${esc(draft.text)}</textarea>
    <div class="composer-foot">
      <div class="composer-left">
        ${voice ? `<button class="btn btn-secondary btn-sm" data-ract="${recording ? 'stop' : 'record'}">${ic(recording ? 'stop' : 'mic')}${recording ? 'Stop' : 'Speak'}</button>` : '<span class="muted">Voice needs Chrome, Edge or Safari</span>'}
        <button class="btn-link" data-ract="skip">Skip this bullet</button>
      </div>
      <button class="btn btn-primary btn-sm" data-ract="send" ${busy || recording ? 'disabled' : ''}>Send answer</button>
    </div>
  </div>`;
}
function sessionHTML(s) {
  const bid = s.bulletIds[s.index];
  const b = bulletById(bid);
  const turns = s.turns[bid] || [];
  const waiting = !busy && turns.length > 0 && !turns.at(-1).answer;
  const progress = s.status === 'summarizing' ? 100 : (s.index / s.bulletIds.length) * 100;
  return `<div class="prep-grid">
    <div class="prep-main">
      <section class="panel interview">
        <div class="interview-head">
          <div><h2>${s.status === 'summarizing' ? 'Wrapping up…' : `Bullet ${Math.min(s.index + 1, s.bulletIds.length)} of ${s.bulletIds.length}`}</h2>
            <div class="mini-bar"><div style="width:${progress}%"></div></div></div>
          <button class="btn btn-secondary btn-sm" data-ract="end" ${busy ? 'disabled' : ''}>End session</button>
        </div>
        ${b && s.status === 'active' ? `<div class="current-bullet"><span class="muted">${esc(b.section === 'experience' ? 'Experience' : 'Project')} · ${esc(b.context)}</span><p>“${esc(b.text)}”</p></div>` : ''}
        <div class="chat" id="resume-chat" aria-live="polite">${s.status === 'summarizing' ? '<div class="msg ai typing"><span class="spinner" aria-hidden="true"></span>Writing your debrief…</div>' : chatHTML(s)}</div>
        ${s.error ? `<div class="fb fb-error"><span>${esc(s.error)}</span><button class="btn btn-secondary btn-sm" data-ract="retry">Try again</button></div>` : ''}
        ${composerHTML(waiting)}
      </section>
    </div>
    <aside class="prep-side">
      <section class="panel"><div class="panel-head"><h2>This session</h2></div>
        <ol class="session-bullets">${s.bulletIds.map((id, i) => {
          const a = s.assessments[id];
          return `<li class="${i === s.index ? 'current' : ''}"><span class="sb-text">${esc(bulletById(id)?.text || '')}</span>${a ? `<span class="rating-chip r-${RATING[a.rating][1]}">${RATING[a.rating][0]}</span>` : i === s.index ? '<span class="chip-static">Now</span>' : ''}</li>`;
        }).join('')}</ol>
      </section>
    </aside>
  </div>`;
}
function scrollChat() { const c = $('#resume-chat'); if (c) c.scrollTop = c.scrollHeight; $('#resume-answer')?.focus({ preventScroll: true }); }

async function run(step) {
  const s = activeSession(); if (!s || busy) return;
  busy = true; renderResume();
  try { await step(s); }
  catch (err) { s.error = err.message; toast(err.message); }
  finally {
    busy = false;
    if (s.status === 'done') { renderResume(); showDebrief(s.id); }
    else renderResume();
  }
}

/* ================= Debrief ================= */
function debriefHTML(s) {
  const sum = s.summary;
  const items = s.bulletIds.map(id => ({ id, b: bulletById(id), a: s.assessments[id], turns: (s.turns[id] || []).filter(t => t.answer) })).filter(x => x.a);
  return `${sum ? `<div class="fb"><p class="fb-summary">${esc(sum.overall)}</p>
      ${sum.strengths.length ? `<div class="fb-sec"><h4>What went well</h4><ul>${sum.strengths.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${sum.focus.length ? `<div class="fb-sec"><h4>What to work on</h4><ol>${sum.focus.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
      ${sum.tips.length ? `<div class="fb-sec"><h4>Before your next interview</h4><ol>${sum.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}</div>` : ''}
    <h3 class="sec-label">Bullet by bullet</h3>
    ${items.map(({ b, a, turns }) => `<div class="debrief-item">
      <div class="debrief-head"><span class="rating-chip r-${RATING[a.rating][1]}">${RATING[a.rating][0]}</span>${a.practiceAgain && a.rating !== 'skipped' ? '<span class="chip-static">Practice again</span>' : ''}</div>
      <p class="debrief-bullet">“${esc(b?.text || '')}”</p>
      ${a.note ? `<p>${esc(a.note)}</p>` : ''}
      ${a.reword ? `<div class="reword"><span class="muted">Suggested rewording for your resume</span><p>${esc(a.reword)}</p></div>` : ''}
      ${turns.length ? `<details><summary>Transcript (${turns.length} question${turns.length > 1 ? 's' : ''})</summary>${turns.map(t => `<p><b>Q:</b> ${esc(t.question)}</p><p><b>A:</b> ${esc(t.answer)}</p>`).join('')}</details>` : ''}
    </div>`).join('') || '<p class="muted">No bullets were discussed.</p>'}`;
}
function showDebrief(id) {
  const s = sessionById(id); if (!s) return;
  const again = s.bulletIds.filter(b => s.assessments[b]?.practiceAgain && s.assessments[b].rating !== 'skipped' && bulletById(b));
  openOverlay('drawer', `
    <div class="sheet-handle" aria-hidden="true"></div>
    <header class="ov-head"><div><h2 id="ov-title">Session debrief</h2><div class="ov-sub"><span class="muted">${new Date(s.date + 'T12:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span></div></div>
      <button class="icon-btn" data-close aria-label="Close">${ic('x')}</button></header>
    <div class="ov-body">${debriefHTML(s)}</div>
    ${again.length ? `<footer class="ov-foot"><button class="btn btn-primary" data-ract="again" data-ids="${again.join(',')}">${ic('refresh')}Practice the ${again.length} weaker bullet${again.length > 1 ? 's' : ''} again</button></footer>` : ''}`);
}

/* ================= Voice ================= */
function startVoice() {
  draft = { text: '', mode: 'voice', durationSec: 0 };
  recording = true;
  recorder = startRecording({
    onText: t => { draft.text = t; const el = $('#resume-answer'); if (el) el.value = t; },
    onStop: ({ text, durationSec }) => { recording = false; clearInterval(recTick); draft = { text, mode: 'voice', durationSec }; renderResume(); },
    onError: msg => { recording = false; clearInterval(recTick); toast(msg); renderResume(); },
  });
  renderResume();
  recTick = setInterval(() => { const el = $('[data-rtime]'); if (el && recorder) el.textContent = mmss(recorder.elapsed()); }, 500);
}

/* ================= Events ================= */
function sendAnswer() {
  const text = ($('#resume-answer')?.value || draft.text).trim();
  if (text.split(/\s+/).length < 3) { toast('Say a bit more first.'); return; }
  const { mode, durationSec } = draft;
  draft = { text: '', mode: 'type', durationSec: 0 };
  run(s => answer(s, text, mode, durationSec));
}

function onClick(e) {
  const b = e.target.closest('[data-ract]'); if (!b || b.tagName === 'INPUT') return;
  const act = b.dataset.ract;
  if (act === 'paste') { const t = $('#resume-text').value.trim(); if (t.length < 40) toast('Paste a bit more of your resume.'); else upload({ text: t }); }
  else if (act === 'replace') confirmModal({ title: 'Replace your resume?', text: 'Your practice history stays for any bullet that is still on the new resume.', ok: 'Replace' }, () => { removeResume(); renderResume(); });
  else if (act === 'pick-suggested') { selected = new Set(suggestBullets()); renderResume(); }
  else if (act === 'pick-weak') { selected = new Set(allBullets().filter(x => ['weak', 'okay'].includes(practiceOf(x.id)?.lastRating)).map(x => x.id)); renderResume(); if (!selected.size) toast('No bullets need work yet.'); }
  else if (act === 'pick-none') { selected = new Set(); renderResume(); }
  else if (act === 'start') { startSession([...selected], today()); selected = null; draft = { text: '', mode: 'type', durationSec: 0 }; run(advance); }
  else if (act === 'send') sendAnswer();
  else if (act === 'record') startVoice();
  else if (act === 'stop') recorder?.stop();
  else if (act === 'skip') run(skipBullet);
  else if (act === 'retry') run(advance);
  else if (act === 'end') confirmModal({ title: 'End the session now?', text: "You'll get a debrief for the bullets you've discussed so far.", ok: 'End session' }, () => { recorder?.stop(); run(finish); });
  else if (act === 'view-session') showDebrief(b.dataset.id);
  else if (act === 'again') { closeOverlay(true); startSession(b.dataset.ids.split(','), today()); run(advance); }
}

export function initResume() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', e => {
    if (e.target.dataset.ract === 'file' && e.target.files[0]) upload({ file: e.target.files[0] });
    if (e.target.dataset.ract === 'toggle') {
      const id = e.target.dataset.id;
      if (e.target.checked) selected.add(id); else selected.delete(id);
      e.target.closest('.bullet-row').classList.toggle('on', e.target.checked);
      $('#resume-selected').textContent = `${selected.size} selected`;
      $('[data-ract="start"]').disabled = !selected.size;
    }
  });
  document.addEventListener('input', e => { if (e.target.id === 'resume-answer' && !recording) draft.text = e.target.value; });
  document.addEventListener('keydown', e => { if (e.target.id === 'resume-answer' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendAnswer(); } });
  document.addEventListener('dragover', e => { if (e.target.closest?.('[data-ract="drop"]')) { e.preventDefault(); e.target.closest('[data-ract="drop"]').classList.add('over'); } });
  document.addEventListener('dragleave', e => { e.target.closest?.('[data-ract="drop"]')?.classList.remove('over'); });
  document.addEventListener('drop', e => {
    const zone = e.target.closest?.('[data-ract="drop"]'); if (!zone) return;
    e.preventDefault(); zone.classList.remove('over');
    const f = e.dataTransfer.files[0]; if (f) upload({ file: f });
  });
}

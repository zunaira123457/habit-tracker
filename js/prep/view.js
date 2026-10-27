'use strict';
// Interview Prep screen, the Today checklist card, and the Interview Prep settings.
// After any change it fires a "prep:changed" event so the app can update the streak and cat.
import { $, $$, esc, ic, pad } from '../util.js';
import { state, ui, saveUI } from '../store.js';
import { toast } from '../ui.js';
import { prep, savePrep, prepLevel, dayProgress, SECTION_TARGET } from './state.js';
import {
  loadCatalog, catalogReady, ensureDay, problemOf, slotSeconds, toggleTimer, markResult, undoResult,
  skipSlot, unskip, progressStats, formatDate,
} from './plan.js';
import { askAI } from './ai.js';
import { loadBank, bankReady, ensureBehavioral } from './behavioral.js';
import { initBehavioral, renderBehavioralToday, renderLibrary } from './behavioral-view.js';
import { challengesReady, ensureDebugging } from './debugging.js';
import { initDebugging, renderDebugToday, renderDebugTab } from './debugging-view.js';
import { renderMarkdown } from './markdown.js';

const today = () => state.currentDay;
const changed = () => document.dispatchEvent(new CustomEvent('prep:changed'));
const HINT_LABEL = { 1: 'Hint · pattern', 2: 'Approach outline', 3: 'Full explanation' };
const HINT_BUTTON = { 1: 'Get a hint', 2: 'Next: approach outline', 3: 'Next: full explanation' };
const pendingHints = new Set();
let loadError = null;

const clock = s => { s = Math.floor(s); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const LEVEL_TEXT = { full: 'Full day', light: 'Light day', none: 'Not done yet' };

/* ================= Problem cards ================= */
function timerInner(running) { return running ? `${ic('pause')}<span>Pause</span>` : `${ic('play')}<span>Start</span>`; }

function cardHTML(date, slot) {
  const p = problemOf(slot.slug);
  if (!p) return '';
  const running = prep.timer?.slug === slot.slug && prep.timer?.date === date;
  const secs = slotSeconds(date, slot);
  const title = esc(p.title);
  const result = slot.result
    ? `<div class="prob-result ${slot.result}">
         <span class="prob-result-label">${ic(slot.result === 'solved' ? 'check' : 'flag')}${slot.result === 'solved' ? 'Solved' : 'Struggled'}</span>
         <span class="prob-result-time">${secs >= 1 ? `in ${clock(secs)}` : ''}</span>
         <button class="btn-link" data-pact="undo">Undo</button>
       </div>`
    : `<div class="result-btns" role="group" aria-label="Mark ${title}">
         <button class="btn btn-secondary btn-sm res-solved" data-pact="solved">${ic('check')}Solved</button>
         <button class="btn btn-secondary btn-sm res-struggled" data-pact="struggled">${ic('flag')}Struggled</button>
         <button class="btn btn-secondary btn-sm" data-pact="skip" title="${slot.kind === 'new' ? 'Set this one aside and get the next problem' : 'Review it tomorrow instead'}">Skip</button>
       </div>`;
  const next = slot.hints.length + 1;
  const loading = pendingHints.has(slot.slug);
  const hints = slot.hints.map((h, i) => `
    <div class="hint"><div class="hint-label">${ic('bulb')}${HINT_LABEL[i + 1]}</div><div class="md">${renderMarkdown(h)}</div></div>`).join('');
  const hintControls = next <= 3 ? `
    <div class="hint-ask">
      <input class="input hint-notes" data-pact-input="notes" value="${esc(slot.notes || '')}" placeholder="Optional: what you've tried so far" aria-label="What you've tried so far (sent with the hint)">
      <button class="btn btn-secondary btn-sm" data-pact="hint" ${loading ? 'disabled' : ''}>${loading ? '<span class="spinner" aria-hidden="true"></span>Thinking…' : `${ic('bulb')}${HINT_BUTTON[next]}`}</button>
    </div>` : '';

  return `<article class="prob ${slot.result ? 'is-done' : ''}" data-slug="${esc(slot.slug)}">
    <div class="prob-head">
      <div class="prob-title">
        <span class="kind-tag ${slot.kind}">${slot.kind === 'new' ? 'New' : 'Review'}</span>
        <h3>${title}</h3>
      </div>
      <span class="diff diff-${p.difficulty.toLowerCase()}">${p.difficulty}</span>
    </div>
    <div class="prob-meta">
      <span>${esc(p.category)}</span>
      <a class="btn btn-secondary btn-sm" href="${esc(p.url)}" target="_blank" rel="noopener">Open on LeetCode${ic('external')}</a>
      ${p.premium ? `<a class="btn-link" href="${esc(p.freeUrl)}" target="_blank" rel="noopener" title="This is a LeetCode Premium problem">Free version on NeetCode${ic('external')}</a>` : ''}
    </div>
    <div class="prob-actions">
      <div class="prob-timer">
        <span class="clock" aria-label="Time spent">${clock(secs)}</span>
        ${slot.result ? '' : `<button class="btn btn-secondary btn-sm timer-btn ${running ? 'running' : ''}" data-pact="timer" aria-pressed="${running}">${timerInner(running)}</button>`}
      </div>
      ${result}
    </div>
    ${hints || hintControls ? `<div class="hints">${hints}${hintControls}</div>` : ''}
  </article>`;
}

function renderProblems() {
  const list = $('#lc-list');
  if (loadError) { list.innerHTML = `<div class="empty"><b>Couldn't load the problem list</b><span>${esc(loadError)}</span></div>`; return; }
  const day = ensureDay(today());
  if (!day) { list.innerHTML = '<div class="empty"><span>Loading problems…</span></div>'; return; }
  const { done, total } = dayProgress(today()).leetcode;
  $('#lc-count').textContent = `${done}/${total}`;
  $('#lc-count').classList.toggle('all', total > 0 && done === total);
  list.innerHTML = day.leetcode.length
    ? day.leetcode.map(s => cardHTML(today(), s)).join('')
    : '<div class="empty"><div class="empty-ic">🏆</div><b>All 250 done</b><span>Nothing new left and no reviews due today.</span></div>';
}
function rerenderCard(slug) {
  const slot = prep.days[today()]?.leetcode.find(s => s.slug === slug);
  const el = $(`#lc-list .prob[data-slug="${CSS.escape(slug)}"]`);
  if (slot && el) el.outerHTML = cardHTML(today(), slot);
}

/* ================= Progress panels ================= */
function renderProgress() {
  if (!catalogReady()) return;
  const st = progressStats(today());
  const pct = st.solved / st.total * 100;
  const projection = st.finish
    ? `${formatDate(st.finish)} <small>at your pace of ${st.pace.toFixed(1)}/day</small>`
    : `${formatDate(st.plannedFinish)} <small>if you keep 2 new a day</small>`;
  $('#lc-progress').innerHTML = `
    <div class="panel-head"><h2>NeetCode 250</h2><span class="count ${st.solved === st.total ? 'all' : ''}">${st.solved}/${st.total} solved</span></div>
    <div class="panel-body">
      <div class="big-bar" role="progressbar" aria-label="Problems solved" aria-valuemin="0" aria-valuemax="${st.total}" aria-valuenow="${st.solved}"><div style="width:${pct}%"></div></div>
      <dl class="kv">
        <div><dt>Projected finish</dt><dd>${projection}</dd></div>
        <div><dt>Due for review</dt><dd>${st.due}</dd></div>
        <div><dt>Skipped</dt><dd>${st.skipped.length}</dd></div>
      </dl>
      ${st.skipped.length ? `<details class="skipped"><summary>Show skipped problems</summary><ul>${st.skipped.map(slug => `
        <li><span>${esc(problemOf(slug)?.title || slug)}</span><button class="btn-link" data-pact="unskip" data-slug="${esc(slug)}">Put back in the queue</button></li>`).join('')}</ul></details>` : ''}
    </div>`;
  $('#lc-cats').innerHTML = `
    <div class="panel-head"><h2>By category</h2></div>
    <ul class="cat-list">${st.byCategory.map(c => `
      <li class="${c.solved === c.total ? 'complete' : ''}">
        <div class="cat-row"><span>${esc(c.name)}</span><span class="cat-num">${c.solved}/${c.total}</span></div>
        <div class="mini-bar"><div style="width:${c.solved / c.total * 100}%"></div></div>
      </li>`).join('')}</ul>`;
}

let tab = 'today';
function showTab(t) {
  tab = t;
  $$('#prep-tabs [data-ptab]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ptab === t));
  $('#prep-today-pane').hidden = t !== 'today';
  $('#prep-debug-pane').hidden = t !== 'debugging';
  $('#prep-library-pane').hidden = t !== 'library';
  if (t === 'library') renderLibrary();
  if (t === 'debugging') renderDebugTab();
}
export function renderPrep() { renderProblems(); renderProgress(); renderDebugToday(); renderBehavioralToday(); if (tab === 'library') renderLibrary(); }

/* ================= Today checklist ================= */
export function renderChecklist() {
  const box = $('#prep-check'); if (!box) return;
  if (catalogReady()) ensureDay(today());
  if (bankReady()) ensureBehavioral(today());
  if (challengesReady()) ensureDebugging(today());
  const level = prepLevel(today());
  const prog = dayProgress(today());
  const min = prep.settings.lightDay;
  const lightText = [min.leetcode ? `${min.leetcode} problem${min.leetcode > 1 ? 's' : ''}` : '', min.debugging ? 'the debugging challenge' : '', min.behavioral ? `${min.behavioral} behavioral` : ''].filter(Boolean).join(' + ');
  const row = (emoji, name, p, target) => {
    const total = p.total || target, pct = p.total ? p.done / p.total : 0;
    return `<li class="row check-row ${p.total && p.done === p.total ? 'done' : ''}">
        <div class="status">${ringSVG(pct)}</div>
        <div class="row-main">
          <div class="row-title"><span class="row-emoji" aria-hidden="true">${emoji}</span><span class="row-name">${name}</span></div>
          <div class="row-progress"><div class="pbar"><div class="pfill" style="width:${pct * 100}%"></div></div><span class="amount">${p.done} <small>/ ${total}</small></span></div>
        </div>
        <div class="row-actions"><button class="btn btn-secondary btn-sm" data-goto="prep">Open${ic('right')}</button></div>
      </li>`;
  };
  box.innerHTML = `
    <header class="group-head">
      <div><h2>Interview Prep${prep.enabled ? `<span class="req" title="Required daily to keep your streak">${ic('lock')}Non-negotiable</span>` : ''}</h2>
        <p>${prep.enabled ? `Full day: everything below · Light day: ${lightText}` : "Doesn't count toward your streak (turned off in Settings)"}</p></div>
      <span class="count level-${level}">${level === 'none' ? '' : ic('check').replace('class="ic"', 'class="ic sm"')}${LEVEL_TEXT[level]}</span>
    </header>
    <ul class="rows">
      ${row('🧩', 'NeetCode problems', prog.leetcode, SECTION_TARGET.leetcode)}
      ${row('🐞', 'Debugging challenge', prog.debugging, SECTION_TARGET.debugging)}
      ${row('🎤', 'Behavioral questions', prog.behavioral, SECTION_TARGET.behavioral)}
    </ul>`;
}
const RING_C = 94.25;
const ringSVG = pct => `<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-bg" cx="18" cy="18" r="15"/><circle class="ring-fg" cx="18" cy="18" r="15" stroke-dasharray="${RING_C}" stroke-dashoffset="${(RING_C * (1 - pct)).toFixed(2)}" transform="rotate(-90 18 18)"/><circle class="ring-done" cx="18" cy="18" r="15"/><path class="ring-check" d="M12 18.5l4 4 8-9"/></svg>`;

/* ================= Settings ================= */
export function renderPrepSettings() {
  const box = $('#prep-settings'); if (!box) return;
  box.innerHTML = `
    <div class="set-row">
      <div><h3><label for="prep-enabled">Counts toward your streak</label></h3><p>When on, finishing the plan (full or light) is required to keep your streak, like a non-negotiable.</p></div>
      <div><input type="checkbox" class="switch" role="switch" id="prep-enabled" ${prep.enabled ? 'checked' : ''}></div>
    </div>
    <div class="set-row">
      <div><h3 id="light-h">Light day minimum</h3><p>What still keeps your streak on a busy day. A light day gives 4 XP instead of 10.</p></div>
      <div class="light-fields" role="group" aria-labelledby="light-h">
        <div class="inline-field"><input class="input" id="light-lc" type="number" min="0" max="3" step="1" value="${prep.settings.lightDay.leetcode}" aria-label="NeetCode problems"><span>NeetCode problems</span></div>
        <div class="inline-field"><input class="input" id="light-dbg" type="number" min="0" max="1" step="1" value="${prep.settings.lightDay.debugging || 0}" aria-label="Debugging challenges"><span>debugging challenge</span></div>
        <div class="inline-field"><input class="input" id="light-bq" type="number" min="0" max="2" step="1" value="${prep.settings.lightDay.behavioral}" aria-label="Behavioral questions"><span>behavioral questions</span></div>
      </div>
    </div>
    <div class="set-row">
      <div><h3 id="dbg-lang-h">Debugging language</h3><p>Which languages your daily debugging challenges use.</p></div>
      <div class="seg" role="group" aria-labelledby="dbg-lang-h">
        ${[['both', 'Both'], ['python', 'Python'], ['javascript', 'JavaScript']].map(([v, l]) => `<button type="button" data-dbg-lang="${v}" aria-pressed="${(prep.settings.debugLanguage || 'both') === v}">${l}</button>`).join('')}
      </div>
    </div>
    <div class="set-row">
      <div><h3><label for="ai-passcode">AI passcode</label></h3><p>Must match <code>APP_PASSCODE</code> on the server. Saved only on this device.</p></div>
      <input class="input" id="ai-passcode" type="password" autocomplete="off" value="${esc(ui.aiPasscode || '')}" placeholder="Enter passcode">
    </div>`;
}

/* ================= Events ================= */
async function requestHint(slug) {
  const slot = prep.days[today()]?.leetcode.find(s => s.slug === slug);
  const p = problemOf(slug);
  if (!slot || !p || pendingHints.has(slug) || slot.hints.length >= 3) return;
  const level = slot.hints.length + 1;
  pendingHints.add(slug); rerenderCard(slug);
  try {
    const { hint } = await askAI('neetcode-hint', {
      problem: { slug, title: p.title, difficulty: p.difficulty, category: p.category },
      level, previousHints: slot.hints, notes: slot.notes || '',
    });
    slot.hints.push(hint);
    savePrep();
  } catch (err) {
    toast(err.message);
  } finally {
    pendingHints.delete(slug); rerenderCard(slug);
  }
}

function onClick(e) {
  const b = e.target.closest('[data-pact]'); if (!b) return;
  const act = b.dataset.pact;
  if (act === 'unskip') { unskip(b.dataset.slug); renderProgress(); toast('Back in the queue'); return; }
  const slug = b.closest('.prob')?.dataset.slug; if (!slug) return;
  const date = today();
  if (act === 'timer') { toggleTimer(date, slug); rerenderCard(slug); return; }
  if (act === 'hint') { requestHint(slug); return; }
  if (act === 'solved' || act === 'struggled') {
    markResult(date, slug, act);
    toast(act === 'solved' ? `Solved: ${problemOf(slug).title}` : `Logged. You'll see it again tomorrow.`, 'success');
  } else if (act === 'undo') undoResult(date, slug);
  else if (act === 'skip') {
    const kind = prep.days[date].leetcode.find(s => s.slug === slug)?.kind;
    const next = skipSlot(date, slug);
    toast(kind === 'review' ? 'Review moved to tomorrow' : next ? `Skipped. Next up: ${problemOf(next).title}` : 'Skipped');
  }
  renderPrep(); changed();
}

export function initPrep() {
  $('#view-prep').addEventListener('click', onClick);
  document.addEventListener('click', e => { const b = e.target.closest('[data-ptab]'); if (b) { if (!$('#view-prep').classList.contains('active')) location.hash = '#prep'; showTab(b.dataset.ptab); } });
  document.addEventListener('prep:tab', e => showTab(e.detail));
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-dbg-lang]'); if (!b) return;
    prep.settings.debugLanguage = b.dataset.dbgLang; savePrep();
    $$('[data-dbg-lang]').forEach(x => x.setAttribute('aria-pressed', x === b));
    renderDebugToday(); renderChecklist(); changed(); toast('Debugging language saved', 'success');
  });
  initBehavioral();
  initDebugging()
    .then(() => { renderDebugToday(); renderChecklist(); changed(); })
    .catch(err => { const l = $('#dbg-today'); if (l) l.innerHTML = `<div class="empty"><b>Couldn't load challenges</b><span>${esc(err.message)}</span></div>`; });
  $('#view-prep').addEventListener('input', e => {
    if (e.target.dataset.pactInput !== 'notes') return;
    const slot = prep.days[today()]?.leetcode.find(s => s.slug === e.target.closest('.prob').dataset.slug);
    if (slot) { slot.notes = e.target.value.slice(0, 2000); savePrep(); }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'prep-enabled') { prep.enabled = e.target.checked; savePrep(); renderChecklist(); changed(); toast(prep.enabled ? 'Interview Prep now counts toward your streak' : 'Interview Prep no longer affects your streak', 'success'); }
    const LIGHT = { 'light-lc': 'leetcode', 'light-dbg': 'debugging', 'light-bq': 'behavioral' };
    if (LIGHT[e.target.id]) {
      const field = LIGHT[e.target.id];
      const max = SECTION_TARGET[field];
      const n = Math.min(max, Math.max(0, Math.round(Number(e.target.value) || 0)));
      const othersTotal = Object.entries(prep.settings.lightDay).reduce((sum, [k, v]) => sum + (k === field ? 0 : v || 0), 0);
      if (n === 0 && !othersTotal) { e.target.value = prep.settings.lightDay[field]; toast('A light day needs at least one item.'); return; }
      e.target.value = n; prep.settings.lightDay[field] = n; savePrep(); renderChecklist(); changed(); toast('Light day minimum saved', 'success');
    }
    if (e.target.id === 'ai-passcode') { ui.aiPasscode = e.target.value.trim(); saveUI(); toast('AI passcode saved on this device', 'success'); }
  });
  // live clock for the running problem timer
  setInterval(() => {
    const t = prep.timer; if (!t || t.date !== today()) return;
    const slot = prep.days[t.date]?.leetcode.find(s => s.slug === t.slug);
    const el = $(`#lc-list .prob[data-slug="${CSS.escape(t.slug)}"] .clock`);
    if (slot && el) el.textContent = clock(slotSeconds(t.date, slot));
  }, 1000);
  loadCatalog()
    .then(() => { renderPrep(); renderChecklist(); changed(); })
    .catch(err => { loadError = err.message; renderPrep(); });
  loadBank()
    .then(() => { renderBehavioralToday(); renderChecklist(); changed(); })
    .catch(err => { const l = $('#bq-list'); if (l) l.innerHTML = `<div class="empty"><b>Couldn't load questions</b><span>${esc(err.message)}</span></div>`; });
}
export { $$ };

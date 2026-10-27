'use strict';
import { $, $$, EMOJIS, EPS, KEY, STAGES, THRESH, esc, ic, keyOf, pad, parseKey, uid } from './util.js';
import { catMood, commitTimer, currentStreak, defaultState, findTask, isDone, longestFromHistory, replaceState, rollover, save, saveUI, stageOf, state, todayOK, ui, unitOf, updateLongest, val } from './store.js';
import { catSVG } from './cat.js';
import { closeOverlay, confetti, confirmModal, openOverlay, overlay, toast, trapFocus } from './ui.js';

/* ================= Cat reactions ================= */
function animateCat(cls) {
  const w = $('#cat-wrap'); w.classList.remove('hop', 'party'); void w.offsetWidth; w.classList.add(cls);
  setTimeout(() => w.classList.remove(cls), cls === 'party' ? 1500 : 700);
}
let tempMsgUntil = 0;
function say(msg, ms = 2800) {
  const b = $('#cat-bubble'); b.textContent = msg; tempMsgUntil = Date.now() + ms;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  setTimeout(() => { if (Date.now() >= tempMsgUntil) renderCat(); }, ms + 20);
}

/* ================= TODAY ================= */
const RING_C = 94.25;
function clock(v) { const totalSec = Math.floor(v * 60 + EPS); return `${Math.floor(totalSec / 60)}:${pad(totalSec % 60)}`; }
function fmtNum(n) { return Math.round(n * 100) / 100; }
function amountHTML(t, v) {
  return t.type === 'time'
    ? `${clock(v)} <small>/ ${fmtNum(t.target)} min</small>`
    : `${fmtNum(v)} <small>/ ${fmtNum(t.target)} ${esc(unitOf(t))}</small>`;
}
const ring = pct => `<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-bg" cx="18" cy="18" r="15"/><circle class="ring-fg" cx="18" cy="18" r="15" stroke-dasharray="${RING_C}" stroke-dashoffset="${(RING_C * (1 - pct)).toFixed(2)}" transform="rotate(-90 18 18)"/><circle class="ring-done" cx="18" cy="18" r="15"/><path class="ring-check" d="M12 18.5l4 4 8-9"/></svg>`;
const timerInner = running => running ? `${ic('pause')}<span>Pause</span>` : `${ic('play')}<span>Start</span>`;
const quickAdd = (ph, label) => `<form class="quick-add"><input name="amt" type="number" step="any" inputmode="decimal" placeholder="${ph}" aria-label="${esc(label)}"><button type="submit">Add</button></form>`;

function taskRow(t) {
  const v = val(t), done = v >= t.target - EPS, pct = Math.min(1, v / t.target);
  const running = !!(state.timer && state.timer.id === t.id), name = esc(t.name);
  const actions = t.type === 'time'
    ? `<button class="btn btn-secondary btn-sm timer-btn ${running ? 'running' : ''}" data-act="timer" aria-pressed="${running}" aria-label="${running ? 'Pause' : 'Start'} timer for ${name}">${timerInner(running)}</button>${quickAdd('min', `Minutes to add to ${t.name}`)}`
    : `<div class="stepper"><button class="icon-btn" data-act="dec" aria-label="Decrease ${name} by 1">${ic('minus')}</button><button class="icon-btn" data-act="inc" aria-label="Increase ${name} by 1">${ic('plus')}</button></div>${quickAdd('qty', `Amount to add to ${t.name}`)}`;
  return `<li class="row ${done ? 'done' : ''}" data-id="${t.id}">
    <div class="status" title="${done ? 'Complete' : Math.round(pct * 100) + '% complete'}">${ring(pct)}</div>
    <div class="row-main">
      <div class="row-title"><span class="row-emoji" aria-hidden="true">${esc(t.emoji || (t.type === 'time' ? '⏱️' : '✨'))}</span><span class="row-name">${name}</span>${t.nonneg ? `<span class="req" title="Required daily to keep your streak">${ic('lock')}Non-negotiable</span>` : ''}</div>
      <div class="row-progress"><div class="pbar" role="progressbar" aria-label="${name} progress" aria-valuemin="0" aria-valuemax="${t.target}" aria-valuenow="${fmtNum(v)}"><div class="pfill" style="width:${pct * 100}%"></div></div><span class="amount">${amountHTML(t, v)}</span></div>
    </div>
    <div class="row-actions">${actions}</div>
  </li>`;
}
function updateCard(id) {
  const t = findTask(id), el = document.querySelector(`.row[data-id="${id}"]`);
  if (!t || !el) return;
  const v = val(t), pct = Math.min(1, v / t.target), done = v >= t.target - EPS, running = !!(state.timer && state.timer.id === id);
  el.querySelector('.pfill').style.width = pct * 100 + '%';
  el.querySelector('.pbar').setAttribute('aria-valuenow', fmtNum(v));
  el.querySelector('.ring-fg').setAttribute('stroke-dashoffset', (RING_C * (1 - pct)).toFixed(2));
  el.querySelector('.status').title = done ? 'Complete' : Math.round(pct * 100) + '% complete';
  el.querySelector('.amount').innerHTML = amountHTML(t, v);
  el.classList.toggle('done', done);
  const tb = el.querySelector('[data-act="timer"]');
  if (tb) {
    tb.classList.toggle('running', running); tb.setAttribute('aria-pressed', running);
    tb.setAttribute('aria-label', `${running ? 'Pause' : 'Start'} timer for ${t.name}`);
    tb.innerHTML = timerInner(running);
  }
}
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
let lastStreak = null;
function renderHeader() {
  const s = currentStreak(), best = Math.max(state.longest || 0, s);
  $('#cat-streak').textContent = s;
  $('#sb-streak').textContent = s;
  $('#sb-best').textContent = best;
  if (lastStreak !== null && s > lastStreak) { const p = $('#cat-streak-wrap'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  lastStreak = s;
}
let catKey = '';
function catMessage(s, mood) {
  const name = state.catName || 'Kitty';
  const nn = state.tasks.filter(t => t.nonneg);
  if (!nn.length) return `Add a non-negotiable so ${name} can start growing.`;
  if (mood === 'happy') return s >= 100 ? `All hail the streak! ${s} days of greatness. 👑` : `Purrfect! Today's streak is safe. 🎉`;
  if (mood === 'sad') return `${name} feels a little sad. The streak reset, so let's start fresh today. 💕`;
  const left = nn.filter(t => !isDone(t)).length;
  if (mood === 'sleep') return `${name} is snoozing. Finish your non-negotiables to start a streak. 💤`;
  return `${left} non-negotiable${left > 1 ? 's' : ''} left today. ${name} believes in you! ✨`;
}
function renderCat() {
  const s = currentStreak(), st = stageOf(s), mood = catMood(s), k = st + '|' + mood + '|' + state.catName;
  if (k !== catKey) { $('#cat-wrap').innerHTML = catSVG(st, mood); catKey = k; }
  $('#cat-name').textContent = state.catName || 'Kitty';
  $('#cat-level').textContent = `Level ${st + 1} · ${STAGES[st].name}`;
  if (st < 5) {
    const need = THRESH[st + 1] - s;
    $('#cat-next').textContent = `${need} more day${need > 1 ? 's' : ''} until ${STAGES[st + 1].name}`;
    $('#cat-next-bar').style.width = ((s - THRESH[st]) / (THRESH[st + 1] - THRESH[st]) * 100) + '%';
  } else {
    $('#cat-next').textContent = 'Max level reached. Legendary! 👑';
    $('#cat-next-bar').style.width = '100%';
  }
  if (Date.now() >= tempMsgUntil) $('#cat-bubble').textContent = catMessage(s, mood);
}
function renderSummary() {
  const nn = state.tasks.filter(t => t.nonneg), reg = state.tasks.filter(t => !t.nonneg);
  const nd = nn.filter(isDone).length, rd = reg.filter(isDone).length;
  const c = $('#nn-count'), cAll = nn.length > 0 && nd === nn.length;
  c.innerHTML = `${cAll ? ic('check').replace('class="ic"', 'class="ic sm"') : ''}${nd}/${nn.length}`; c.classList.toggle('all', cAll);
  const r = $('#reg-count'), rAll = reg.length > 0 && rd === reg.length;
  r.innerHTML = `${rAll ? ic('check').replace('class="ic"', 'class="ic sm"') : ''}${rd}/${reg.length}`; r.classList.toggle('all', rAll);
}
function emptyState(icon, title, text, action, actionAttr) {
  return `<li class="empty"><div class="empty-ic" aria-hidden="true">${icon}</div><b>${title}</b><span>${text}</span>${action ? `<button class="btn btn-secondary btn-sm" ${actionAttr}>${ic('plus')}${action}</button>` : ''}</li>`;
}
function renderToday() {
  const nn = state.tasks.filter(t => t.nonneg), reg = state.tasks.filter(t => !t.nonneg);
  $('#nn-list').innerHTML = nn.length ? nn.map(taskRow).join('')
    : emptyState('🔒', 'No non-negotiables yet', 'Add a daily must-do. Completing all of them is what grows your streak and your cat.', 'Add non-negotiable', 'data-new="nn"');
  $('#reg-list').innerHTML = reg.length ? reg.map(taskRow).join('')
    : emptyState('🌸', 'No bonus tasks', 'Optional extras for good days. They never affect your streak.', 'Add bonus task', 'data-new="reg"');
  renderHeader(); renderCat(); renderSummary(); renderStats(); renderMiniCal();
}

/* completion tracking → reactions */
const doneSet = new Set();
let allDone = false;
function syncStatus(animate) {
  let newlyDone = null;
  state.tasks.forEach(t => {
    if (isDone(t)) { if (!doneSet.has(t.id)) { doneSet.add(t.id); newlyDone = t; } }
    else doneSet.delete(t.id);
  });
  [...doneSet].forEach(id => { if (!findTask(id)) doneSet.delete(id); });
  const nowAll = todayOK();
  const celebrateNow = animate && nowAll && !allDone;
  const dayChanged = nowAll !== allDone;
  allDone = nowAll;
  updateLongest();
  renderHeader(); renderCat(); renderSummary();
  if (dayChanged) { renderStats(); renderMiniCal(); if (isActive('history')) renderCalendar(); }
  if (!animate) return;
  if (newlyDone) {
    const el = document.querySelector(`.row[data-id="${newlyDone.id}"]`);
    if (el) { el.classList.remove('just-done'); void el.offsetWidth; el.classList.add('just-done'); setTimeout(() => el.classList.remove('just-done'), 900); }
  }
  if (celebrateNow) {
    animateCat('party'); confetti();
    say(`All non-negotiables done! 🎉 ${currentStreak()} day streak!`, 4000);
    toast(`Streak updated: ${currentStreak()} day${currentStreak() > 1 ? 's' : ''} 🔥`, 'success');
    save();
  } else if (newlyDone) {
    animateCat('hop');
    say(`Yay, ${newlyDone.name} done! ${['💕', '✨', '🐾', '🌟'][Math.floor(Math.random() * 4)]}`);
  }
}
function addProgress(t, delta) {
  if (!t) return;
  let base = Math.max(0, (state.progress[t.id] || 0) + delta);
  state.progress[t.id] = Math.round(base * 1000) / 1000;
  save(); updateCard(t.id); syncStatus(true);
}
function toggleTimer(id) {
  const prev = state.timer && state.timer.id;
  commitTimer();
  if (prev !== id) state.timer = { id, start: Date.now() };
  save();
  if (prev) updateCard(prev);
  updateCard(id);
  syncStatus(true);
}

$('#view-today').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = b.closest('.row').dataset.id, t = findTask(id);
  if (b.dataset.act === 'timer') toggleTimer(id);
  else if (b.dataset.act === 'inc') addProgress(t, 1);
  else if (b.dataset.act === 'dec') addProgress(t, -1);
});
$('#view-today').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, v = parseFloat(f.elements.amt.value);
  const t = findTask(f.closest('.row').dataset.id);
  if (!isFinite(v) || v === 0) { f.elements.amt.focus(); return; }
  addProgress(t, v); f.reset();
  toast(`${v > 0 ? 'Added' : 'Removed'} ${fmtNum(Math.abs(v))} ${unitOf(t)} · ${t.name}`, 'success');
});
function petCat() {
  const lines = ['Purr~ 💕', 'Mrrp! 🐾', '*slow blink* 😌', 'Nya~! ✨', 'More streaks = more treats 🐟', 'You\'re doing great!'];
  animateCat('hop'); say(lines[Math.floor(Math.random() * lines.length)], 2000);
}
$('#cat-wrap').addEventListener('click', petCat);
$('#cat-wrap').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); petCat(); } });

/* ================= Stats & calendars ================= */
const now0 = new Date();
let viewMonth = { y: now0.getFullYear(), m: now0.getMonth() };
let selectedDay = null;
function dayStatus(k) {
  if (k > state.currentDay) return 'future';
  if (k === state.currentDay) return todayOK() ? 'today-ok' : 'today';
  if (k < state.startDate) return 'pre';
  const h = state.history[k];
  return h && h.ok ? 'ok' : 'fail';
}
const STATUS_LABEL = { ok: 'Streak kept', fail: 'Streak lost', today: 'Today, in progress', 'today-ok': 'Today, streak kept', pre: 'No data', future: 'Upcoming' };
function renderStats() {
  const keys = Object.keys(state.history);
  const okPast = keys.filter(k => state.history[k].ok).length;
  const s = currentStreak();
  const rate = keys.length ? Math.round(okPast / keys.length * 100) + '%' : '—';
  const html = `
    <div class="stat"><span class="stat-label">${ic('flame')}Current streak</span><b>${s}</b></div>
    <div class="stat"><span class="stat-label">${ic('trophy')}Longest streak</span><b>${Math.max(state.longest || 0, s)}</b></div>
    <div class="stat"><span class="stat-label">${ic('checkCircle')}Days kept</span><b>${okPast + (todayOK() ? 1 : 0)}</b></div>
    <div class="stat"><span class="stat-label">${ic('chart')}Success rate</span><b>${rate}</b></div>`;
  $('#side-stats').innerHTML = html;
  $('#hist-stats').innerHTML = html;
}
const longDate = k => parseKey(k).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
function renderMiniCal() {
  const d = parseKey(state.currentDay), y = d.getFullYear(), m = d.getMonth();
  const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  $('#mini-h').textContent = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  let html = '';
  for (let i = 0; i < first.getDay(); i++) html += '<span class="mini-cell blank"></span>';
  for (let i = 1; i <= days; i++) {
    const k = keyOf(new Date(y, m, i)), st = dayStatus(k);
    html += `<button class="mini-cell st-${st}" data-k="${k}" title="${longDate(k)}: ${STATUS_LABEL[st]}" aria-label="${longDate(k)}, ${STATUS_LABEL[st]}">${i}</button>`;
  }
  $('#mini-grid').innerHTML = html;
}
function renderCalendar() {
  const { y, m } = viewMonth, first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  $('#month-label').textContent = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  let html = '', kept = 0, missed = 0;
  for (let i = 0; i < first.getDay(); i++) html += '<div class="cal-cell blank"></div>';
  for (let d = 1; d <= days; d++) {
    const k = keyOf(new Date(y, m, d)), st = dayStatus(k);
    if (st === 'ok' || st === 'today-ok') kept++; else if (st === 'fail') missed++;
    const mark = st === 'ok' || st === 'today-ok' ? `${ic('check')}Kept` : st === 'fail' ? `${ic('x')}Missed` : st === 'today' ? 'Today' : '';
    html += `<button class="cal-cell st-${st} ${k === selectedDay ? 'sel' : ''}" data-k="${k}" aria-label="${longDate(k)}, ${STATUS_LABEL[st]}"><span class="cal-num">${d}</span><span class="cal-mark">${mark}</span></button>`;
  }
  $('#cal-grid').innerHTML = html;
  $('#month-sum').innerHTML = `<span><i class="dot" style="background:var(--ok)"></i>${kept} kept</span><span><i class="dot" style="background:var(--bad)"></i>${missed} missed</span>`;
}
function dayParts(k) {
  const st = dayStatus(k);
  let tag = '', rows = null, note = '';
  if (st === 'future') { tag = '<span class="tag">Upcoming</span>'; note = 'This day hasn\'t happened yet.'; }
  else if (st === 'pre') { tag = '<span class="tag">No data</span>'; note = `This is before you started tracking on ${parseKey(state.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}.`; }
  else if (k === state.currentDay) {
    tag = todayOK() ? `<span class="tag ok">${ic('check')}Streak kept</span>` : '<span class="tag">In progress</span>';
    rows = state.tasks.map(t => ({ ...t, unit: unitOf(t), value: val(t) }));
  } else {
    const h = state.history[k] || { ok: false, missed: true, tasks: [] };
    tag = h.ok ? `<span class="tag ok">${ic('check')}Streak kept</span>` : `<span class="tag fail">${ic('x')}Streak lost</span>`;
    if (h.missed || !h.tasks.length) note = 'You didn\'t check in this day, so it counts as missed.';
    else rows = h.tasks;
  }
  let body;
  if (rows) {
    body = rows.length ? `<ul class="d-list">${rows.map(t => {
      const done = t.value >= t.target - EPS, pct = Math.min(100, t.value / t.target * 100);
      const v = t.type === 'time' ? `${Math.floor(t.value + EPS)} / ${fmtNum(t.target)} min` : `${fmtNum(t.value)} / ${fmtNum(t.target)} ${esc(t.unit)}`;
      return `<li class="d-row ${done ? 'done' : ''}"><span class="row-emoji" aria-hidden="true">${esc(t.emoji || '✨')}</span>
        <div style="min-width:0"><div class="row-name">${esc(t.name)}${t.nonneg ? `<span class="req">${ic('lock')}Non-negotiable</span>` : ''}</div><div class="pbar"><div class="pfill" style="width:${pct}%"></div></div></div>
        <span class="d-v">${v}${done ? ic('check') : ''}</span></li>`;
    }).join('')}</ul>` : '<p class="d-note">No tasks were set up on this day.</p>';
  } else body = `<p class="d-note">${note}</p>`;
  return { title: longDate(k), tag, body };
}
function openDayDetail(k) {
  selectedDay = k;
  const p = dayParts(k);
  openOverlay('drawer', `
    <div class="sheet-handle" aria-hidden="true"></div>
    <header class="ov-head"><div><h2 id="ov-title">${p.title}</h2><div class="ov-sub" id="day-tag">${p.tag}</div></div><button class="icon-btn" data-close aria-label="Close">${ic('x')}</button></header>
    <div class="ov-body" id="day-body">${p.body}</div>`, () => { selectedDay = null; renderCalendar(); });
  renderCalendar();
}
function refreshDayDetail() {
  if (!selectedDay || !$('#day-body')) return;
  const p = dayParts(selectedDay);
  $('#day-body').innerHTML = p.body; $('#day-tag').innerHTML = p.tag;
}
function renderHistory() { renderStats(); renderCalendar(); }
$('#prev-month').onclick = () => { viewMonth.m--; if (viewMonth.m < 0) { viewMonth.m = 11; viewMonth.y--; } renderCalendar(); };
$('#next-month').onclick = () => { viewMonth.m++; if (viewMonth.m > 11) { viewMonth.m = 0; viewMonth.y++; } renderCalendar(); };
$('#this-month').onclick = () => { const d = parseKey(state.currentDay); viewMonth = { y: d.getFullYear(), m: d.getMonth() }; renderCalendar(); };
$('#cal-grid').addEventListener('click', e => { const c = e.target.closest('.cal-cell[data-k]'); if (c) openDayDetail(c.dataset.k); });
$('#mini-grid').addEventListener('click', e => { const c = e.target.closest('.mini-cell[data-k]'); if (c) openDayDetail(c.dataset.k); });

/* ================= SETTINGS ================= */
function renderSettings() {
  const inp = $('#cat-name-input'); if (document.activeElement !== inp) inp.value = state.catName;
  $$('#theme-seg [data-theme-opt]').forEach(b => b.setAttribute('aria-pressed', b.dataset.themeOpt === ui.theme));
  $('#task-admin').innerHTML = state.tasks.length ? state.tasks.map(t => `
    <li class="admin-row" data-id="${t.id}">
      <span class="row-emoji" aria-hidden="true">${esc(t.emoji || '✨')}</span>
      <div style="min-width:0"><div class="admin-name"><span>${esc(t.name)}</span>${t.nonneg ? `<span class="req">${ic('lock')}Non-negotiable</span>` : ''}</div>
        <div class="admin-meta">${ic(t.type === 'time' ? 'timer' : 'hash')}${t.type === 'time' ? 'Time' : 'Count'} · ${fmtNum(t.target)} ${esc(unitOf(t))} daily</div></div>
      <div class="admin-actions">
        <button class="icon-btn" data-edit aria-label="Edit ${esc(t.name)}" title="Edit">${ic('edit')}</button>
        <button class="icon-btn danger" data-del aria-label="Delete ${esc(t.name)}" title="Delete">${ic('trash')}</button>
      </div>
    </li>`).join('') : emptyState('📝', 'No tasks yet', 'Create your first task to start tracking.', 'Create task', 'data-new="nn"');
}
$('#cat-name-input').addEventListener('input', e => {
  state.catName = e.target.value.trim().slice(0, 20) || 'Mochi'; save(); renderCat();
});
$('#cat-name-input').addEventListener('change', () => toast('Cat name saved', 'success'));
$('#task-admin').addEventListener('click', e => {
  const row = e.target.closest('.admin-row'); if (!row) return;
  const t = findTask(row.dataset.id);
  if (e.target.closest('[data-edit]')) openTaskForm(t);
  else if (e.target.closest('[data-del]')) confirmModal({
    title: `Delete "${t.name}"?`, text: 'Today\'s progress for this task will be removed. Past history keeps its record.', ok: 'Delete task',
  }, () => {
    state.tasks = state.tasks.filter(x => x.id !== t.id);
    delete state.progress[t.id];
    if (state.timer && state.timer.id === t.id) state.timer = null;
    save(); renderSettings(); renderToday(); syncStatus(false); toast('Task deleted', 'success');
  });
});
$('#reset-all').onclick = () => confirmModal({
  title: 'Reset all data?', text: 'All tasks, history, streaks and your cat\'s progress will be erased. This cannot be undone.', ok: 'Reset everything',
}, () => {
  try { localStorage.removeItem(KEY); } catch (e) {}
  replaceState(defaultState()); save();
  doneSet.clear(); allDone = false; lastStreak = null; catKey = '';
  selectedDay = null;
  renderAll(); toast('All data reset. Fresh start! 🌱', 'success');
});

/* ================= Task form ================= */
function openTaskForm(task, preset = {}) {
  const t = task ? { ...task } : { name: '', emoji: '⭐', type: 'count', target: '', unit: '', nonneg: !!preset.nonneg };
  let type = t.type;
  const p = openOverlay('modal', `
    <div class="sheet-handle" aria-hidden="true"></div>
    <header class="ov-head"><h2 id="ov-title">${task ? 'Edit task' : 'New task'}</h2><button class="icon-btn" data-close aria-label="Close">${ic('x')}</button></header>
    <form id="task-form" novalidate style="display:contents">
      <div class="ov-body">
        <div class="field"><label class="field-label" for="f-name">Name</label><input class="input" id="f-name" name="name" maxlength="40" value="${esc(t.name)}" placeholder="e.g. Read, Pushups, Journal" autocomplete="off" ${task ? '' : 'data-autofocus'}></div>
        <div class="field"><span class="field-label" id="f-icon-l">Icon</span>
          <div class="emoji-field"><input class="input" name="emoji" maxlength="8" value="${esc(t.emoji || '')}" aria-labelledby="f-icon-l">
          <div class="emoji-grid" role="group" aria-label="Suggested icons">${EMOJIS.map(e => `<button type="button" class="pick" data-e="${e}" aria-pressed="${e === t.emoji}" aria-label="Use ${e}">${e}</button>`).join('')}</div></div>
        </div>
        <div class="field"><span class="field-label" id="f-type-l">Type</span><div class="seg" role="group" aria-labelledby="f-type-l">
          <button type="button" data-type="time">${ic('timer')}Time</button><button type="button" data-type="count">${ic('hash')}Count</button></div></div>
        <div class="row2">
          <div class="field"><label class="field-label" for="f-target">Daily target <em id="tgt-hint"></em></label><input class="input" id="f-target" name="target" type="number" min="0" step="any" inputmode="decimal" value="${esc(t.target)}" placeholder="e.g. 20"></div>
          <div class="field" id="unit-field"><label class="field-label" for="f-unit">Unit label</label><input class="input" id="f-unit" name="unit" maxlength="16" value="${esc(t.type === 'count' ? t.unit : '')}" placeholder="glasses, reps…" autocomplete="off"></div>
        </div>
        <label class="toggle-row"><div><b>${ic('lock')}Non-negotiable</b><small>Must be completed every day to keep your streak</small></div>
          <input type="checkbox" name="nonneg" class="switch" role="switch" ${t.nonneg ? 'checked' : ''}></label>
        <div class="err" id="form-err" role="alert"></div>
      </div>
      <footer class="ov-foot"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="submit" class="btn btn-primary">${task ? 'Save changes' : 'Create task'}</button></footer>
    </form>`);
  const f = p.querySelector('form');
  const syncType = () => {
    $$('.seg button', p).forEach(b => b.setAttribute('aria-pressed', b.dataset.type === type));
    $('#unit-field', p).style.display = type === 'count' ? '' : 'none';
    $('#tgt-hint', p).textContent = type === 'time' ? '(minutes)' : '(amount)';
    $('.row2', p).style.gridTemplateColumns = type === 'count' ? '1fr 1fr' : '1fr';
  };
  syncType();
  $('.seg', p).onclick = e => { const b = e.target.closest('button'); if (b) { type = b.dataset.type; syncType(); } };
  $('.emoji-grid', p).onclick = e => {
    const b = e.target.closest('.pick'); if (!b) return;
    f.elements.emoji.value = b.dataset.e;
    $$('.pick', p).forEach(x => x.setAttribute('aria-pressed', x === b));
  };
  f.onsubmit = e => {
    e.preventDefault();
    const name = f.elements.name.value.trim(), target = parseFloat(f.elements.target.value);
    const err = $('#form-err', p);
    f.elements.name.removeAttribute('aria-invalid'); f.elements.target.removeAttribute('aria-invalid');
    if (!name) { err.textContent = 'Give your task a name.'; f.elements.name.setAttribute('aria-invalid', 'true'); f.elements.name.focus(); return; }
    if (!(target > 0)) { err.textContent = 'Target must be greater than 0.'; f.elements.target.setAttribute('aria-invalid', 'true'); f.elements.target.focus(); return; }
    const data = { name, emoji: f.elements.emoji.value.trim(), type, target, unit: type === 'time' ? 'min' : (f.elements.unit.value.trim() || 'times'), nonneg: f.elements.nonneg.checked };
    if (task) {
      const orig = findTask(task.id);
      if (orig.type !== data.type) {  // progress means something different now
        state.progress[orig.id] = 0;
        if (state.timer && state.timer.id === orig.id) state.timer = null;
      }
      Object.assign(orig, data);
    } else state.tasks.push({ id: uid(), ...data });
    save(); closeOverlay(); renderSettings(); renderToday(); syncStatus(false);
    toast(task ? 'Task saved' : 'Task created', 'success');
  };
}
document.addEventListener('click', e => {
  const n = e.target.closest('[data-new]'); if (n) { openTaskForm(null, { nonneg: n.dataset.new === 'nn' }); return; }
  const g = e.target.closest('[data-goto]'); if (g) showView(g.dataset.goto);
});
$('#new-task-top').onclick = () => openTaskForm(null);

/* ================= Theme & sidebar ================= */
const THEME_ICON = { system: 'monitor', light: 'sun', dark: 'moon' };
const THEME_NAME = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' };
function applyTheme() {
  const r = document.documentElement;
  if (ui.theme === 'system') r.removeAttribute('data-theme'); else r.dataset.theme = ui.theme;
  $('#theme-icon').innerHTML = ic(THEME_ICON[ui.theme]);
  $('#theme-label').textContent = THEME_NAME[ui.theme];
  $('#theme-toggle').title = `${THEME_NAME[ui.theme]} (click to change)`;
  $('#theme-toggle-m').innerHTML = ic(THEME_ICON[ui.theme]);
  $('#theme-toggle-m').setAttribute('aria-label', `${THEME_NAME[ui.theme]}, change theme`);
  $$('#theme-seg [data-theme-opt]').forEach(b => b.setAttribute('aria-pressed', b.dataset.themeOpt === ui.theme));
  requestAnimationFrame(() => $('meta[name="theme-color"]').setAttribute('content', getComputedStyle(document.body).backgroundColor));
}
function setTheme(t) { ui.theme = t; saveUI(); applyTheme(); }
const cycleTheme = () => setTheme({ system: 'light', light: 'dark', dark: 'system' }[ui.theme]);
$('#theme-toggle').onclick = () => { cycleTheme(); toast(THEME_NAME[ui.theme]); };
$('#theme-toggle-m').onclick = () => { cycleTheme(); toast(THEME_NAME[ui.theme]); };
$('#theme-seg').onclick = e => { const b = e.target.closest('[data-theme-opt]'); if (b) setTheme(b.dataset.themeOpt); };
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

const app = $('#app');
const isDesktop = () => matchMedia('(min-width:1024px)').matches;
function applySidebar() {
  app.classList.toggle('sb-collapsed', ui.sidebar === 'collapsed');
  const expanded = isDesktop() ? ui.sidebar !== 'collapsed' : app.classList.contains('sb-open');
  $('#sb-toggle').setAttribute('aria-expanded', expanded);
  $('#sb-toggle .lbl-text').textContent = expanded ? 'Collapse' : 'Expand';
}
$('#sb-toggle').onclick = () => {
  if (isDesktop()) { ui.sidebar = ui.sidebar === 'collapsed' ? 'expanded' : 'collapsed'; saveUI(); }
  else app.classList.toggle('sb-open');
  applySidebar();
};
$('#sb-scrim').onclick = () => { app.classList.remove('sb-open'); applySidebar(); };
window.addEventListener('resize', () => { if (isDesktop()) app.classList.remove('sb-open'); applySidebar(); });

/* ================= Navigation & boot ================= */
const VIEWS = {
  today: () => ({ title: 'Today', sub: `${greeting()} · ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}` }),
  history: () => ({ title: 'History', sub: 'Your streak, day by day' }),
  settings: () => ({ title: 'Settings', sub: 'Tasks, appearance and data' }),
};
let currentView = 'today';
const isActive = v => currentView === v;
function showView(v) {
  currentView = v;
  $$('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + v));
  $$('[data-view]').forEach(b => { if (b.dataset.view === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  const h = VIEWS[v]();
  $('#page-title').textContent = h.title; $('#page-sub').textContent = h.sub;
  document.title = `${h.title} · Paw Streak`;
  $('#new-task-top').style.display = v === 'history' ? 'none' : '';
  if (v === 'today') renderToday();
  if (v === 'history') renderHistory();
  if (v === 'settings') renderSettings();
  app.classList.remove('sb-open'); applySidebar();
  window.scrollTo({ top: 0 });
}
$$('[data-view]').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));

document.addEventListener('keydown', e => {
  if (overlay) {
    if (e.key === 'Escape') { e.preventDefault(); closeOverlay(); }
    else if (e.key === 'Tab') trapFocus(e);
    return;
  }
  if (e.key === 'Escape' && app.classList.contains('sb-open')) { app.classList.remove('sb-open'); applySidebar(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tg = e.target;
  if (tg.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (e.key === '1') showView('today');
  else if (e.key === '2') showView('history');
  else if (e.key === '3') showView('settings');
  else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openTaskForm(null); }
});

function renderAll() {
  renderToday(); renderSettings(); renderHistory(); syncStatus(false);
}
function checkNewDay() {
  if (rollover()) {
    const n = new Date(); viewMonth = { y: n.getFullYear(), m: n.getMonth() };
    renderAll(); showView(currentView);
    toast('A new day! Progress has been reset. 🌅');
    return true;
  }
  return false;
}

// static icons
$$('[data-icon]').forEach(el => { el.outerHTML = ic(el.dataset.icon); });
$('#prev-month').innerHTML = ic('left');
$('#next-month').innerHTML = ic('right');

rollover();
if (!state.startDate || state.startDate > state.currentDay) state.startDate = state.currentDay;
longestFromHistory(); updateLongest(); save();
applyTheme(); applySidebar();
renderAll();
showView('today');

setInterval(() => {
  if (checkNewDay()) return;
  if (state.timer) {
    updateCard(state.timer.id); syncStatus(true);
    if (selectedDay === state.currentDay) refreshDayDetail();
  }
}, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !checkNewDay()) { renderHeader(); renderCat(); } });

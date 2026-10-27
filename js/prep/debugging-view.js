'use strict';
// Debugging workspace: editor, file list, run/submit, hints, AI review, and today's challenge card.
import { $, $$, esc, ic } from '../util.js';
import { state } from '../store.js';
import { toast, confirmModal, openOverlay, confetti } from '../ui.js';
import { prep, savePrep } from './state.js';
import {
  loadChallenges, challengesReady, challengeOf, allChallenges, originalFiles, currentFiles, descriptionOf,
  solutionNotesOf, solutionFiles, record, saveEdit, resetFiles, isModified, ensureDebugging, skipChallenge,
  runVisible, submit, debuggingStats,
} from './debugging.js';
import { isPythonReady } from './sandbox/sandbox.js';
import { diffProject } from './diff.js';
import { askAI } from './ai.js';
import { renderMarkdown } from './markdown.js';

const today = () => state.currentDay;
const changed = () => document.dispatchEvent(new CustomEvent('prep:changed'));
const LANG = { python: 'Python', javascript: 'JavaScript' };
const HINT_LABEL = { 1: 'Where to look', 2: 'Narrowing it down', 3: 'Full explanation' };
const HINT_BUTTON = { 1: 'Get a hint', 2: 'Next: narrow it down', 3: 'Next: full explanation' };
const VERDICT = { 'root-cause': ['Fixed the root cause', 'ok'], partial: ['Partly fixed', 'mid'], 'symptom-patch': ['Patched a symptom', 'warn'], incorrect: ['Not fixed yet', 'bad'] };
const STATUS = { 'fixed-root-cause': ['Root cause fixed', 'ok'], 'patched-symptom': ['Symptom patched', 'warn'], missed: ['Missed', 'bad'] };

let cm = null;              // CodeMirror exports, loaded on first use
let view = null;            // EditorView
let activeId = null, activePath = null, original = {}, description = '';
const editorStates = new Map();
let busy = null;            // 'run' | 'submit' | null
let output = null;          // { kind: 'visible' | 'submit', result, submission, error }
let hintLoading = false;
const reviewing = new Set();
let saveTimer = null;

/* ================= Today's card ================= */
const chips = c => `<span class="chip-static lang-${c.language}">${LANG[c.language]}</span><span class="diff diff-${c.difficulty}">${c.difficulty[0].toUpperCase() + c.difficulty.slice(1)}</span><span class="chip-static">${c.bugCount} bug${c.bugCount > 1 ? 's' : ''}</span>`;

export function renderDebugToday() {
  const box = $('#dbg-today'); if (!box) return;
  const slot = challengesReady() ? ensureDebugging(today()) : null;
  const count = $('#dbg-count');
  if (!slot) { box.innerHTML = '<div class="empty"><span>Loading challenges…</span></div>'; return; }
  count.textContent = `${slot.done ? 1 : 0}/1`;
  count.classList.toggle('all', !!slot.done);
  if (!slot.id) {
    box.innerHTML = `<div class="empty"><div class="empty-ic">🏆</div><b>No challenges left</b><span>You've solved or skipped every challenge${prep.settings.debugLanguage !== 'both' ? ` in ${LANG[prep.settings.debugLanguage]}` : ''}. Today's debugging counts as done.</span></div>`;
    return;
  }
  const c = challengeOf(slot.id), r = record(slot.id);
  const edited = Object.keys(r.files).length > 0;
  const last = r.submissions.at(-1);
  const status = slot.done ? `<span class="done-tag">${ic('check')}Solved</span>`
    : last ? `<span class="muted">${last.passedCount}/${last.total} hidden tests passed last time</span>`
    : edited ? '<span class="muted">In progress</span>' : '<span class="muted">Not started</span>';
  box.innerHTML = `<div class="dbg-card ${slot.done ? 'is-done' : ''}">
    <div class="prob-head"><div class="prob-title">${chips(c)}</div>${status}</div>
    <h3>${esc(c.title)}</h3>
    <p class="muted">${esc(c.summary)}</p>
    <div class="dbg-card-foot"><button class="btn ${slot.done ? 'btn-secondary' : 'btn-primary'} btn-sm" data-dact="open" data-id="${c.id}">${ic('code')}${slot.done ? 'Review your fix' : edited ? 'Continue debugging' : 'Open workspace'}</button></div>
  </div>`;
}

/* ================= Workspace ================= */
async function loadEditor() {
  cm ??= await import('../../vendor/codemirror.js');
  return cm;
}
function editorTheme() {
  return cm.EditorView.theme({
    '&': { height: '100%', fontSize: '13px', backgroundColor: 'var(--surface)', color: 'var(--text)' },
    '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', lineHeight: '1.6' },
    '.cm-gutters': { backgroundColor: 'var(--surface-2)', color: 'var(--text-3)', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 6%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--text)' },
    '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--text)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent) !important' },
    '&.cm-focused': { outline: 'none' },
    '.cm-matchingBracket': { backgroundColor: 'color-mix(in srgb, var(--accent) 18%, transparent)', outline: 'none' },
    '.cm-tooltip, .cm-panels': { backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  });
}
function makeState(path, doc) {
  const c = challengeOf(activeId);
  return cm.EditorState.create({
    doc,
    extensions: [
      cm.basicSetup,
      c.language === 'python' ? cm.python() : cm.javascript(),
      cm.indentUnit.of(c.language === 'python' ? '    ' : '  '),
      cm.keymap.of([cm.indentWithTab]),
      cm.syntaxHighlighting(cm.classHighlighter),
      editorTheme(),
      cm.EditorView.contentAttributes.of({ 'aria-label': `Code editor: ${path}` }),
      cm.EditorView.updateListener.of(u => { if (u.docChanged) onEdit(path, u.state.doc.toString()); }),
    ],
  });
}
function onEdit(path, content) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveEdit(activeId, path, content, original[path]);
    const li = $(`.dbg-files [data-path="${CSS.escape(path)}"]`);
    if (li) li.classList.toggle('modified', isModified(activeId, path));
    renderDebugToday();
  }, 300);
}
function flushEdit() {
  if (!saveTimer || !view) return;
  clearTimeout(saveTimer); saveTimer = null;
  saveEdit(activeId, activePath, view.state.doc.toString(), original[activePath]);
}

export async function openWorkspace(id) {
  const c = challengeOf(id); if (!c) return;
  flushEdit();
  activeId = id; output = null; editorStates.clear();
  if (location.hash !== '#prep') location.hash = '#prep';
  document.dispatchEvent(new CustomEvent('prep:tab', { detail: 'debugging' }));
  const pane = $('#dbg-workspace');
  pane.innerHTML = '<div class="panel"><div class="empty"><span class="spinner" aria-hidden="true"></span><span>Opening the project…</span></div></div>';
  try {
    [original, description] = await Promise.all([originalFiles(id), descriptionOf(id)]);
    await loadEditor();
  } catch (err) {
    pane.innerHTML = `<div class="panel"><div class="empty"><b>Couldn't open the challenge</b><span>${esc(err.message)}</span></div></div>`;
    return;
  }
  const files = await currentFiles(id);
  activePath = c.files.find(p => !c.visibleTests.includes(p) && /^services\//.test(p)) || c.files.find(p => !c.visibleTests.includes(p)) || c.files[0];
  renderWorkspace();
  view = new cm.EditorView({ state: makeState(activePath, files[activePath]), parent: $('#dbg-editor') });
}

function fileTree() {
  const c = challengeOf(activeId);
  const groups = {};
  for (const p of c.files) (groups[p.includes('/') ? p.split('/')[0] : ''] ??= []).push(p);
  return Object.entries(groups).sort(([a], [b]) => (a === 'tests') - (b === 'tests') || a.localeCompare(b)).map(([dir, paths]) => `
    <li class="dbg-dir">${dir ? `<span class="dir-name">${ic('folder')}${esc(dir)}/</span>` : ''}
      <ul>${paths.map(p => `<li><button type="button" class="dbg-file ${p === activePath ? 'active' : ''} ${isModified(activeId, p) ? 'modified' : ''}" data-path="${esc(p)}" data-dact="file" aria-current="${p === activePath}">
        <span>${esc(dir ? p.slice(dir.length + 1) : p)}</span><span class="mod-dot" title="Edited" aria-label="edited"></span></button></li>`).join('')}</ul></li>`).join('');
}

function hintsHTML() {
  const r = record(activeId);
  const next = r.hints.length + 1;
  return `${r.hints.map((h, i) => `<div class="hint"><div class="hint-label">${ic('bulb')}${HINT_LABEL[i + 1]}</div><div class="md">${renderMarkdown(h)}</div></div>`).join('')}
    ${next <= 3 ? `<button class="btn btn-secondary btn-sm" data-dact="hint" ${hintLoading ? 'disabled' : ''}>${hintLoading ? '<span class="spinner" aria-hidden="true"></span>Thinking…' : `${ic('bulb')}${HINT_BUTTON[next]}`}</button>` : ''}`;
}

function renderWorkspace() {
  const c = challengeOf(activeId), r = record(activeId);
  const isToday = prep.days[today()]?.debugging?.id === activeId;
  $('#dbg-workspace').innerHTML = `
    <div class="dbg">
      <aside class="dbg-side">
        <section class="panel dbg-brief">
          <div class="dbg-brief-head">
            <div class="prob-title">${chips(c)}${r.solvedOn ? `<span class="done-tag">${ic('check')}Solved</span>` : ''}</div>
            <label class="sr-only" for="dbg-pick">Switch challenge</label>
            <select id="dbg-pick" class="input input-sm" data-dact="pick">${allChallenges().map(x => `<option value="${x.id}" ${x.id === activeId ? 'selected' : ''}>${prep.debugging?.[x.id]?.solvedOn ? '✓ ' : ''}${esc(x.title)} · ${LANG[x.language]} · ${x.difficulty}</option>`).join('')}</select>
          </div>
          ${!isToday ? '<p class="note">Extra practice. This isn\'t today\'s challenge, so solving it won\'t change today\'s plan.</p>' : ''}
          <details class="dbg-desc" open><summary>Task</summary><div class="md">${renderMarkdown(description)}</div></details>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Files</h2><button class="btn-link" data-dact="reset-all">${ic('refresh')}Reset all</button></div>
          <ul class="dbg-files">${fileTree()}</ul>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Help</h2><span class="count">${r.hints.length}/3 hints</span></div>
          <div class="panel-body hints" id="dbg-hints">${hintsHTML()}</div>
          <div class="panel-body dbg-help-foot">
            <button class="btn-link" data-dact="solution">${ic('flag')}${r.revealed ? 'Show the solution again' : 'Show the solution'}</button>
            ${isToday && !r.solvedOn ? `<button class="btn-link" data-dact="skip">Skip this challenge</button>` : ''}
          </div>
        </section>
      </aside>
      <section class="panel dbg-main">
        <div class="dbg-toolbar">
          <div class="dbg-path"><span id="dbg-path-name">${esc(activePath)}</span><button class="btn-link" data-dact="reset-file" ${isModified(activeId, activePath) ? '' : 'hidden'}>Reset file</button></div>
          <div class="dbg-actions">
            <button class="btn btn-secondary btn-sm" data-dact="run" ${busy ? 'disabled' : ''}>${ic('play')}Run visible tests</button>
            <button class="btn btn-primary btn-sm" data-dact="submit" ${busy ? 'disabled' : ''}>${ic('check')}Submit</button>
          </div>
        </div>
        <div class="dbg-editor" id="dbg-editor"></div>
        <div class="dbg-output" id="dbg-output" aria-live="polite">${outputHTML()}</div>
      </section>
    </div>`;
}

function resultsList(result) {
  return `<ul class="test-list">${result.results.map(t => `
    <li class="${t.ok ? 'pass' : 'fail'}"><span class="t-ic">${ic(t.ok ? 'check' : 'x')}</span>
      <div class="t-body"><span class="t-name">${esc(t.name)}</span> <span class="muted">${esc(t.file)}</span>
      ${t.ok ? '' : `<pre class="t-err">${esc(t.error?.message || 'Failed')}</pre>${(t.error?.trace || []).length ? `<div class="t-trace">${t.error.trace.map(fr => {
        const [file, line] = fr.split(':');
        return challengeOf(activeId).files.includes(file) ? `<button class="btn-link" data-dact="goto" data-path="${esc(file)}" data-line="${esc(line)}">${esc(fr)}</button>` : `<span>${esc(fr)}</span>`;
      }).join('')}</div>` : ''}`}
      </div></li>`).join('')}</ul>${result.logs?.length ? `<details class="t-logs"><summary>Output (${result.logs.length} line${result.logs.length > 1 ? 's' : ''})</summary><pre>${esc(result.logs.join('\n'))}</pre></details>` : ''}`;
}
function reviewHTML(sub) {
  if (reviewing.has(sub)) return '<div class="fb fb-loading"><span class="spinner" aria-hidden="true"></span>Reviewing your changes…</div>';
  if (!sub.review) {
    return `<div class="fb fb-error"><span>${esc(sub.reviewError || (sub.passed ? 'No review yet.' : 'Want feedback on your approach so far?'))}</span>
      <button class="btn btn-secondary btn-sm" data-dact="review">${ic('bulb')}Get an AI review</button></div>`;
  }
  const rv = sub.review, [vLabel, vCls] = VERDICT[rv.verdict];
  return `<div class="fb">
    <div class="fb-head"><span class="verdict v-${vCls}">${vLabel}</span><p class="fb-summary">${esc(rv.summary)}</p></div>
    ${rv.bugs.length ? `<ul class="rubric">${rv.bugs.map(b => `<li><span class="rb-name">${esc(b.bug)}</span><span class="rb-rating st-${STATUS[b.status][1]}">${STATUS[b.status][0]}</span><span class="rb-note">${esc(b.note)}</span></li>`).join('')}</ul>` : ''}
    ${rv.missed.length ? `<div class="fb-sec"><h4>Also worth noticing</h4><ul>${rv.missed.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
    <div class="fb-sec"><h4>How an interviewer would see it</h4><p>${esc(rv.interviewerView)}</p></div>
    ${rv.tips.length ? `<div class="fb-sec"><h4>Next time</h4><ol>${rv.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>` : ''}
  </div>`;
}
function outputHTML() {
  if (busy) {
    const loadingPy = challengeOf(activeId)?.language === 'python' && !isPythonReady();
    return `<div class="out-status"><span class="spinner" aria-hidden="true"></span>${loadingPy ? 'Loading Python in your browser (about 10 MB, first time only)…' : busy === 'submit' ? 'Running the hidden tests…' : 'Running the visible tests…'}</div>`;
  }
  if (!output) return `<p class="out-hint muted">Run the visible tests to see the bug, then <b>Submit</b> to grade your fix against the hidden tests.</p>`;
  if (output.error) return `<div class="out-banner fail">${ic('x')}<span>${esc(output.error)}</span></div>`;
  const { result, submission } = output;
  const allPass = result.total > 0 && result.failed === 0;
  const banner = output.kind === 'submit'
    ? `<div class="out-banner ${allPass ? 'pass' : 'fail'}">${ic(allPass ? 'check' : 'x')}<span>${allPass ? `All ${result.total} hidden tests pass. Solved!` : `${result.failed} of ${result.total} hidden tests failed.`}</span></div>`
    : `<div class="out-banner ${allPass ? 'pass' : 'info'}">${ic(allPass ? 'check' : 'info')}<span>Visible tests: ${result.passed}/${result.total} passed${allPass ? '. Now submit to run the hidden tests.' : ''}</span></div>`;
  return banner + resultsList(result) + (submission ? `<div class="out-review"><h3>AI review of your changes</h3>${reviewHTML(submission)}</div>` : '');
}
function refreshOutput() { const el = $('#dbg-output'); if (el) el.innerHTML = outputHTML(); $$('.dbg-actions .btn').forEach(b => { b.disabled = !!busy; }); }

/* ================= Actions ================= */
function switchFile(path, line) {
  if (!view || original[path] === undefined) return;
  if (path !== activePath) {
    flushEdit();
    editorStates.set(activePath, view.state);
    activePath = path;
    const content = record(activeId).files[path] ?? original[path];
    view.setState(editorStates.get(path) || makeState(path, content));
    $$('.dbg-file').forEach(b => { const on = b.dataset.path === path; b.classList.toggle('active', on); b.setAttribute('aria-current', on); });
    $('#dbg-path-name').textContent = path;
    $('[data-dact="reset-file"]').hidden = !isModified(activeId, path);
  }
  if (line) {
    const n = Math.min(Math.max(1, Number(line)), view.state.doc.lines);
    const ln = view.state.doc.line(n);
    view.dispatch({ selection: { anchor: ln.from, head: ln.to }, scrollIntoView: true });
  }
  view.focus();
}

async function doRun(kind) {
  if (busy || !activeId) return;
  flushEdit();
  busy = kind; refreshOutput();
  const id = activeId;
  try {
    if (kind === 'run') output = { kind: 'visible', result: await runVisible(id) };
    else {
      const { result, submission } = await submit(id, today());
      output = { kind: 'submit', result, submission };
      if (submission.passed) {
        toast('All hidden tests pass. Bug fixed! 🐞', 'success');
        if (prep.days[today()]?.debugging?.id === id) confetti();
        changed();
      }
      renderDebugToday();
      if (submission.passed) requestReview(submission);
    }
  } catch (err) {
    output = { error: err.message };
  } finally {
    busy = null;
    if (activeId === id) { refreshOutput(); }
  }
}

async function requestReview(sub) {
  if (reviewing.has(sub)) return;
  const id = activeId;
  reviewing.add(sub); refreshOutput();
  try {
    sub.review = await askAI('debugging-review', {
      challengeId: id, diff: sub.diff, hintsUsed: sub.hintsUsed, revealed: sub.revealed,
      tests: { passed: sub.passed, passedCount: sub.passedCount, total: sub.total, failures: sub.failures },
    });
    sub.reviewError = null;
  } catch (err) {
    sub.reviewError = err.message;
    toast(err.message);
  } finally {
    reviewing.delete(sub); savePrep();
    if (activeId === id) refreshOutput();
  }
}

async function requestHint() {
  const r = record(activeId);
  if (hintLoading || r.hints.length >= 3) return;
  flushEdit();
  hintLoading = true; $('#dbg-hints').innerHTML = hintsHTML();
  try {
    const { hint } = await askAI('debugging-hint', {
      challengeId: activeId, level: r.hints.length + 1, previousHints: r.hints,
      diff: diffProject(original, await currentFiles(activeId)),
    });
    r.hints.push(hint); savePrep();
  } catch (err) { toast(err.message); }
  finally { hintLoading = false; const el = $('#dbg-hints'); if (el) el.innerHTML = hintsHTML(); renderWorkspaceCounts(); }
}
function renderWorkspaceCounts() { const c = $('.dbg-side .panel:last-child .count'); if (c) c.textContent = `${record(activeId).hints.length}/3 hints`; }

async function showSolution() {
  const r = record(activeId);
  const open = async () => {
    r.revealed = true; savePrep();
    const [notes, files] = await Promise.all([solutionNotesOf(activeId), solutionFiles(activeId)]);
    const c = challengeOf(activeId);
    openOverlay('drawer', `
      <div class="sheet-handle" aria-hidden="true"></div>
      <header class="ov-head"><div><h2 id="ov-title">Solution: ${esc(c.title)}</h2></div><button class="icon-btn" data-close aria-label="Close">${ic('x')}</button></header>
      <div class="ov-body md">${renderMarkdown(notes)}${Object.entries(files).map(([p, src]) => `<h4>${esc(p)} (fixed)</h4><pre><code>${esc(src)}</code></pre>`).join('')}</div>`);
    renderWorkspace(); remountEditor();
  };
  if (r.revealed) return open();
  confirmModal({ title: 'Show the solution?', text: "You can still fix and submit the challenge afterwards, but your stats will note that you saw the solution. Try the hints first if you haven't.", ok: 'Show solution' }, open);
}

async function remountEditor() {
  if (!activeId) return;
  const files = await currentFiles(activeId);
  view?.destroy();
  editorStates.clear();
  view = new cm.EditorView({ state: makeState(activePath, files[activePath]), parent: $('#dbg-editor') });
}

function onClick(e) {
  const b = e.target.closest('[data-dact]'); if (!b || b.tagName === 'SELECT') return;
  const act = b.dataset.dact;
  if (act === 'open') openWorkspace(b.dataset.id);
  else if (act === 'file') switchFile(b.dataset.path);
  else if (act === 'goto') switchFile(b.dataset.path, b.dataset.line);
  else if (act === 'run') doRun('run');
  else if (act === 'submit') doRun('submit');
  else if (act === 'hint') requestHint();
  else if (act === 'review') { const sub = output?.submission; if (sub) requestReview(sub); }
  else if (act === 'solution') showSolution();
  else if (act === 'reset-file') confirmModal({ title: `Reset ${activePath}?`, text: 'Your changes to this file will be lost.', ok: 'Reset file' }, () => {
    resetFiles(activeId, activePath); editorStates.delete(activePath);
    view.setState(makeState(activePath, original[activePath]));
    $(`.dbg-file[data-path="${CSS.escape(activePath)}"]`)?.classList.remove('modified');
    $('[data-dact="reset-file"]').hidden = true; renderDebugToday();
  });
  else if (act === 'reset-all') confirmModal({ title: 'Reset all files?', text: 'Every file goes back to the original buggy version. Your hints and past submissions are kept.', ok: 'Reset all' }, async () => {
    resetFiles(activeId); renderWorkspace(); await remountEditor(); renderDebugToday();
  });
  else if (act === 'skip') confirmModal({ title: 'Skip this challenge?', text: "You'll get the next challenge in the list for today. Skipped challenges don't come back automatically.", ok: 'Skip challenge' }, () => {
    const next = skipChallenge(today(), activeId);
    changed(); renderDebugToday();
    if (next?.id) { openWorkspace(next.id); toast(`Next up: ${challengeOf(next.id).title}`); } else toast('No challenges left');
  });
}

export function initDebugging() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', e => { if (e.target.id === 'dbg-pick') openWorkspace(e.target.value); });
  // Remember edits if the page is closed mid-typing
  window.addEventListener('pagehide', flushEdit);
  return loadChallenges();
}
export function renderDebugTab() {
  if (activeId) return;
  if (!challengesReady()) return;
  const slot = ensureDebugging(today());
  // With nothing left for today, open the first challenge as extra practice (switch with the picker).
  openWorkspace(slot?.id || allChallenges()[0].id);
}
export { debuggingStats };

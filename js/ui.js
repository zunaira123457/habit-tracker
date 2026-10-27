'use strict';
import { $, $$, esc, ic } from './util.js';

/* ================= Effects: toasts, confetti, cat reactions ================= */
export function toast(msg, kind = 'info') {
  const host = $('#toasts'), el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast-ic ${kind}">${ic(kind === 'success' ? 'check' : 'info')}</span><span>${esc(msg)}</span>`;
  host.appendChild(el);
  while (host.children.length > 3) host.firstElementChild.remove();
  void el.offsetWidth; el.classList.add('show');
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 2800);
}
export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = $('#confetti'), colors = ['#F08FAE', '#FFD66B', '#7FD6A9', '#B6A6F6', '#8ED0FF', '#FFC9A3'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = (2.2 + Math.random() * 1.6) + 's';
    p.style.animationDelay = Math.random() * .5 + 's';
    p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
    p.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    if (Math.random() < .3) p.style.borderRadius = '50%';
    box.appendChild(p);
    setTimeout(() => p.remove(), 4500);
  }
}

/* ================= Overlays (modal / drawer) ================= */
export let overlay = null;
export function openOverlay(kind, html, onClose) {
  closeOverlay(true);
  const root = $('#overlay-root');
  const el = document.createElement('div');
  el.className = `ov ov-${kind}`;
  el.innerHTML = `<div class="ov-backdrop" data-close></div><div class="ov-panel" role="dialog" aria-modal="true" aria-labelledby="ov-title" tabindex="-1">${html}</div>`;
  root.appendChild(el);
  overlay = { el, onClose, returnFocus: document.activeElement };
  el.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeOverlay(); });
  void el.offsetWidth; el.classList.add('open');
  const panel = el.querySelector('.ov-panel');
  const target = panel.querySelector('[data-autofocus]') || panel;
  setTimeout(() => target.focus({ preventScroll: true }), 30);
  document.body.style.overflow = 'hidden';
  return panel;
}
export function closeOverlay(immediate) {
  if (!overlay) return;
  const { el, onClose, returnFocus } = overlay;
  overlay = null;
  document.body.style.overflow = '';
  if (immediate) el.remove();
  else { el.classList.remove('open'); setTimeout(() => el.remove(), 230); }
  if (onClose) onClose();
  if (!immediate && returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
}
export function trapFocus(e) {
  const f = $$('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])', overlay.el.querySelector('.ov-panel')).filter(x => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === first || !overlay.el.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
export function confirmModal({ title, text, ok }, cb) {
  const p = openOverlay('modal', `
    <div class="sheet-handle" aria-hidden="true"></div>
    <header class="ov-head"><h2 id="ov-title">${esc(title)}</h2></header>
    <div class="ov-body"><p class="ov-text">${esc(text)}</p></div>
    <footer class="ov-foot"><button class="btn btn-secondary" data-close data-autofocus>Cancel</button><button class="btn btn-danger" data-ok>${esc(ok)}</button></footer>`);
  p.querySelector('[data-ok]').onclick = () => { closeOverlay(); cb(); };
}

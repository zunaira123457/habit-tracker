'use strict';
// Small, safe Markdown renderer for AI responses: everything is HTML-escaped first,
// then a limited set of formatting (headings, lists, code, bold, italics) is applied.
import { esc } from '../util.js';

const inline = s => s
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');

export function renderMarkdown(src) {
  const out = [];
  let list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
  const lines = esc(String(src || '')).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^```\s*([\w+-]*)/);
    if (fence) {
      flushPara(); flushList();
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      out.push(`<pre><code${fence[1] ? ` data-lang="${fence[1]}"` : ''}>${code.join('\n')}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    const ul = line.match(/^\s*[-*]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (h) { flushPara(); flushList(); out.push(`<h4>${inline(h[2])}</h4>`); }
    else if (ul || ol) {
      flushPara();
      const tag = ul ? 'ul' : 'ol';
      if (list && list.tag !== tag) flushList();
      (list ??= { tag, items: [] }).items.push((ul || ol)[1]);
    } else if (!line.trim()) { flushPara(); flushList(); }
    else { flushList(); para.push(line.trim()); }
  }
  flushPara(); flushList();
  return out.join('');
}

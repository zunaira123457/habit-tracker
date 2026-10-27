'use strict';
// Unified diff between two versions of a set of files (LCS line diff; challenge files are small).

function lineOps(a, b) {
  const n = a.length, m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push([' ', a[i], i, j]); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) { ops.push(['-', a[i], i, j]); i++; }
    else { ops.push(['+', b[j], i, j]); j++; }
  }
  while (i < n) { ops.push(['-', a[i], i, j]); i++; }
  while (j < m) { ops.push(['+', b[j], i, j]); j++; }
  return ops;
}

/** Unified diff for one file, with `context` unchanged lines around each change. Empty string if identical. */
export function diffFile(path, before, after, context = 3) {
  if (before === after) return '';
  const ops = lineOps(before.split('\n'), after.split('\n'));
  const changed = ops.map((o, k) => (o[0] !== ' ' ? k : -1)).filter(k => k >= 0);
  if (!changed.length) return '';
  const hunks = [];
  let start = Math.max(0, changed[0] - context), end = Math.min(ops.length, changed[0] + context + 1);
  for (const k of changed.slice(1)) {
    if (k - context <= end) end = Math.min(ops.length, k + context + 1);
    else { hunks.push([start, end]); start = Math.max(0, k - context); end = Math.min(ops.length, k + context + 1); }
  }
  hunks.push([start, end]);
  const out = [`--- a/${path}`, `+++ b/${path}`];
  for (const [s, e] of hunks) {
    const slice = ops.slice(s, e);
    const aStart = slice[0][2] + 1, bStart = slice[0][3] + 1;
    const aLen = slice.filter(o => o[0] !== '+').length, bLen = slice.filter(o => o[0] !== '-').length;
    out.push(`@@ -${aStart},${aLen} +${bStart},${bLen} @@`);
    for (const [op, line] of slice) out.push(op + line);
  }
  return out.join('\n');
}

/** Diff every file that changed between two { path: content } maps. */
export function diffProject(original, current) {
  const paths = [...new Set([...Object.keys(original), ...Object.keys(current)])].sort();
  return paths.map(p => diffFile(p, original[p] ?? '', current[p] ?? '')).filter(Boolean).join('\n');
}

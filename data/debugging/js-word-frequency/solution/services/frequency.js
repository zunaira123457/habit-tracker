const { tokenize } = require('../utils/text');

// Returns a Map of word -> count.
function wordCounts(text) {
  const counts = new Map();
  for (const w of tokenize(text)) counts.set(w, (counts.get(w) || 0) + 1);
  return counts;
}

function topWords(text, n) {
  const counts = wordCounts(text);
  const entries = counts instanceof Map ? [...counts] : Object.entries(counts);
  return entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

module.exports = { wordCounts, topWords };

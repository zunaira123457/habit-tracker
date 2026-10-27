// Checks every problem in data/neetcode250.json against LeetCode's GraphQL API:
// the slug must exist, and its title and difficulty must match our data.
// Usage: node scripts/verify-links.mjs
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../data/neetcode250.json', import.meta.url), 'utf8'));
const QUERY = 'query q($s: String!) { question(titleSlug: $s) { title titleSlug difficulty questionFrontendId isPaidOnly } }';
const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function lookup(slug) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: `https://leetcode.com/problems/${slug}/`, 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ query: QUERY, variables: { s: slug } }),
    });
    if (res.ok) return (await res.json()).data?.question ?? null;
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`LeetCode API kept failing for ${slug}`);
}

const problems = [], notes = [];
let bad = 0;
for (const p of data.problems) {
  const q = await lookup(p.slug);
  if (!q) { bad++; problems.push(`MISSING   ${p.slug}`); }
  else {
    if (q.titleSlug !== p.slug) { bad++; problems.push(`SLUG      ${p.slug} -> ${q.titleSlug}`); }
    if (q.difficulty !== p.difficulty) { bad++; problems.push(`DIFF      ${p.slug}: ours ${p.difficulty}, LeetCode ${q.difficulty}`); }
    if (norm(q.title) !== norm(p.title)) notes.push(`title     ${p.slug}: "${p.title}" vs LeetCode "${q.title}"`);
    if (q.isPaidOnly) notes.push(`premium   ${p.slug} (#${q.questionFrontendId})`);
  }
  await sleep(250);
}

console.log(`Checked ${data.problems.length} problems: ${bad} errors.`);
problems.forEach(l => console.log('  ' + l));
if (notes.length) { console.log('Notes (not errors):'); notes.forEach(l => console.log('  ' + l)); }
process.exit(bad ? 1 : 0);

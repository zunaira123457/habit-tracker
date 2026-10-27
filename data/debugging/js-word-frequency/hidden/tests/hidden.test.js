const { Document } = require('../models/document');
const { wordCounts, topWords } = require('../services/frequency');
const { tokenize } = require('../utils/text');

test('wordCounts returns a Map', () => {
  const counts = wordCounts('to be or not to be');
  assert.ok(counts instanceof Map, 'expected a Map');
  assert.strictEqual(counts.get('to'), 2);
});

test('built-in property names', () => {
  const counts = wordCounts('toString valueOf toString hasOwnProperty');
  assert.strictEqual(counts.get('tostring'), 2);
  assert.strictEqual(counts.get('hasownproperty'), 1);
});

test('tokenize', () => {
  assert.deepStrictEqual(tokenize("It's 3pm -- don't PANIC."), ["it's", 'pm', "don't", 'panic']);
});

test('top words on a document, ties alphabetical', () => {
  const doc = new Document('d', 'b a c b a d');
  assert.deepStrictEqual(topWords(doc.body, 3), [['a', 2], ['b', 2], ['c', 1]]);
});

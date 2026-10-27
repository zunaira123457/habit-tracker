const { topWords } = require('../services/frequency');

test('counts a word like constructor', () => {
  assert.deepStrictEqual(topWords('constructor constructor class', 1), [['constructor', 2]]);
});

test('case and punctuation do not matter', () => {
  assert.deepStrictEqual(topWords('The cat, the CAT! the', 2), [['the', 3], ['cat', 2]]);
});

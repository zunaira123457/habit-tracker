const { LRUCache } = require('../utils/lru');

test('evicts the least recently set', () => {
  const c = new LRUCache(2);
  c.set('a', 1); c.set('b', 2); c.set('c', 3);
  assert.deepStrictEqual([c.has('a'), c.has('b'), c.has('c')], [false, true, true]);
});

test('get refreshes recency', () => {
  const c = new LRUCache(2);
  c.set('a', 1); c.set('b', 2);
  assert.strictEqual(c.get('a'), 1);
  c.set('c', 3);
  assert.deepStrictEqual([c.has('a'), c.has('b'), c.has('c')], [true, false, true]);
});

test('updating an existing key does not evict', () => {
  const c = new LRUCache(2);
  c.set('a', 1); c.set('b', 2); c.set('a', 10);
  assert.strictEqual(c.size, 2);
  assert.strictEqual(c.get('a'), 10);
  c.set('c', 3);
  assert.strictEqual(c.has('b'), false);
});

test('missing key', () => {
  assert.strictEqual(new LRUCache(1).get('nope'), undefined);
});

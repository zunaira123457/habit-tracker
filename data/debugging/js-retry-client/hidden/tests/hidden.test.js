const { withRetry } = require('../utils/retry');
const { fetchUser } = require('../services/client');

test('two retries means three attempts', async () => {
  const seen = [];
  const result = await withRetry(async attempt => { seen.push(attempt); if (attempt < 2) throw new Error('nope'); return 'ok'; }, 2);
  assert.strictEqual(result, 'ok');
  assert.deepStrictEqual(seen, [0, 1, 2]);
});

test('rejects with the last error', async () => {
  let n = 0;
  await assert.rejects(() => withRetry(async () => { n++; throw new Error(`fail ${n}`); }, 1), /fail 2/);
  assert.strictEqual(n, 2);
});

test('synchronous throws are retried too', async () => {
  let n = 0;
  const r = await withRetry(() => { n++; if (n === 1) throw new Error('x'); return 5; }, 1);
  assert.strictEqual(r, 5);
});

test('client gives up after three attempts', async () => {
  let calls = 0;
  const api = { get: async () => { calls++; throw new Error('down'); } };
  await assert.rejects(() => fetchUser(api, 1), /down/);
  assert.strictEqual(calls, 3);
});

const { fetchUser } = require('../services/client');

test('a rejected request is retried', async () => {
  let calls = 0;
  const api = { get: async () => { calls++; if (calls === 1) throw new Error('503'); return { id: 7, name: 'Ana' }; } };
  const user = await fetchUser(api, 7);
  assert.strictEqual(user.name, 'Ana');
  assert.strictEqual(calls, 2);
});

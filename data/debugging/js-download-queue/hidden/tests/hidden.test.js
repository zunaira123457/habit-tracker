const { TaskQueue } = require('../services/queue');
const { mapLimit } = require('../utils/map-limit');

const sleep = ms => new Promise(r => setTimeout(r, ms));

test('results keep input order', async () => {
  const out = await mapLimit([30, 5, 15, 1], 4, async ms => { await sleep(ms); return ms; });
  assert.deepStrictEqual(out, [30, 5, 15, 1]);
});

test('limit is respected', async () => {
  let active = 0, peak = 0;
  await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async () => { active++; peak = Math.max(peak, active); await sleep(5); active--; });
  assert.strictEqual(peak, 3, `peak was ${peak}`);
});

test('tasks start in push order', async () => {
  const q = new TaskQueue(1);
  const started = [];
  await Promise.all(['a', 'b', 'c'].map(x => q.push(async () => { started.push(x); await sleep(1); })));
  assert.deepStrictEqual(started, ['a', 'b', 'c']);
});

test('a failing task rejects its own promise and frees its slot', async () => {
  const q = new TaskQueue(1);
  const bad = q.push(async () => { await sleep(1); throw new Error('nope'); });
  const good = q.push(async () => 'ok');
  await assert.rejects(bad, /nope/);
  assert.strictEqual(await good, 'ok');
});

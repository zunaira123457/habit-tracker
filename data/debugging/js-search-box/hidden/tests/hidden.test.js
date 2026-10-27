const { FakeSearchApi } = require('../models/search-api');
const { SearchBox, withDebounce } = require('../services/search');
const { debounce } = require('../utils/debounce');

const sleep = ms => new Promise(r => setTimeout(r, ms));

test('responses arriving in reverse order', async () => {
  const box = new SearchBox(new FakeSearchApi({ d: 40, do: 20, dog: 5 }));
  await Promise.all([box.run('d'), box.run('do'), box.run('dog')]);
  assert.deepStrictEqual(box.results, ['dog-1', 'dog-2']);
});

test('same query typed again still wins', async () => {
  const box = new SearchBox(new FakeSearchApi({ cat: 30, car: 5 }));
  const first = box.run('cat');
  await sleep(1);
  const second = box.run('car');
  await sleep(1);
  box.api.delays.cat = 2;
  const third = box.run('cat');
  await Promise.all([first, second, third]);
  assert.deepStrictEqual(box.results, ['cat-1', 'cat-2']);
});

test('debounce calls once with the last arguments', async () => {
  const calls = [];
  const f = debounce(x => calls.push(x), 15);
  f(1); f(2); f(3);
  await sleep(40);
  assert.deepStrictEqual(calls, [3]);
});

test('typing quickly sends one request', async () => {
  const api = new FakeSearchApi();
  const box = withDebounce(new SearchBox(api), 15);
  box.typed('c'); box.typed('ca'); box.typed('cat');
  await sleep(60);
  assert.deepStrictEqual(api.calls, ['cat']);
  assert.deepStrictEqual(box.results, ['cat-1', 'cat-2']);
});

test('separate bursts each fire', async () => {
  const calls = [];
  const f = debounce(x => calls.push(x), 10);
  f('a');
  await sleep(30);
  f('b');
  await sleep(30);
  assert.deepStrictEqual(calls, ['a', 'b']);
});

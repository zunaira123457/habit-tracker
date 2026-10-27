const { FakeSearchApi } = require('../models/search-api');
const { SearchBox } = require('../services/search');

test('a slow older response does not replace newer results', async () => {
  const box = new SearchBox(new FakeSearchApi({ cat: 40, car: 5 }));
  await Promise.all([box.run('cat'), box.run('car')]);
  assert.deepStrictEqual(box.results, ['car-1', 'car-2']);
});

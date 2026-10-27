const { Reading } = require('../models/reading');
const { dailySummary } = require('../services/weather');

test('normal day', () => {
  const s = dailySummary([new Reading(10), new Reading(14.5), new Reading(99, false), new Reading(12)]);
  assert.deepStrictEqual(s, { high: 14.5, average: 12.2, count: 3 });
});

test('no readings at all', () => {
  assert.deepStrictEqual(dailySummary([]), { high: null, average: null, count: 0 });
});

test('negative temperatures', () => {
  assert.deepStrictEqual(dailySummary([new Reading(-3), new Reading(-8)]), { high: -3, average: -5.5, count: 2 });
});

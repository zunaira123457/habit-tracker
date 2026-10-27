const { Reading } = require('../models/reading');
const { dailySummary } = require('../services/weather');

test('offline sensor', () => {
  const summary = dailySummary([new Reading(999, false), new Reading(-40, false)]);
  assert.deepStrictEqual(summary, { high: null, average: null, count: 0 });
});

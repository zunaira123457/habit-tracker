const { max, mean } = require('../utils/stats');
const { round1 } = require('../utils/format');

function dailySummary(readings) {
  const temps = readings.filter(r => r.valid).map(r => r.celsius);
  if (temps.length === 0) return { high: null, average: null, count: 0 };
  return { high: max(temps), average: round1(mean(temps)), count: temps.length };
}

module.exports = { dailySummary };

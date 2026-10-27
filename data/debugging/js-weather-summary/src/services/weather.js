const { max, mean } = require('../utils/stats');
const { round1 } = require('../utils/format');

function dailySummary(readings) {
  const temps = readings.filter(r => r.valid).map(r => r.celsius);
  return { high: max(temps), average: round1(mean(temps)), count: temps.length };
}

module.exports = { dailySummary };

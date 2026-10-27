// Dates are 'YYYY-MM-DD' strings with 1-based months.
function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m, d));
}

function nightsBetween(checkIn, checkOut) {
  return Math.round((parseDate(checkOut) - parseDate(checkIn)) / 86400000);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

module.exports = { parseDate, nightsBetween, formatDate };

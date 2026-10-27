// Dollars -> whole cents, to the nearest cent.
function toCents(amount) {
  return Math.floor(amount * 100);
}

function formatCents(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

module.exports = { toCents, formatCents };

const { toCents, formatCents } = require('../utils/currency');

function invoiceTotal(lines, taxRate) {
  const subtotal = lines.reduce((sum, l) => sum + toCents(l.price) * l.qty, 0);
  const tax = Math.round(subtotal * taxRate);
  return { subtotal, tax, total: subtotal + tax, display: formatCents(subtotal + tax) };
}

// Shares as equal as possible that add up exactly to the total; extra cents go first.
function splitEvenly(totalCents, people) {
  const share = Math.floor(totalCents / people);
  return Array(people).fill(share);
}

module.exports = { invoiceTotal, splitEvenly };

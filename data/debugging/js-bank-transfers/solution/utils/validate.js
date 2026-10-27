// Amounts must be a positive whole number of cents.
function validateAmount(cents) {
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new Error('Invalid amount');
  }
}

module.exports = { validateAmount };

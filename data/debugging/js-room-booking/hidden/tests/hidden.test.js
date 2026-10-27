const { Booking } = require('../models/booking');
const { canBook, overlaps } = require('../services/booking');
const { nightsBetween, parseDate, formatDate } = require('../utils/dates');

test('nights across a year end and a leap day', () => {
  assert.strictEqual(nightsBetween('2023-12-30', '2024-01-02'), 3);
  assert.strictEqual(nightsBetween('2024-02-28', '2024-03-01'), 2);
});

test('parse and format round trip', () => {
  assert.strictEqual(formatDate(parseDate('2024-07-04')), '2024-07-04');
});

test('real overlap is rejected', () => {
  const existing = [new Booking('a', '2024-05-10', '2024-05-15')];
  assert.strictEqual(canBook(existing, new Booking('b', '2024-05-14', '2024-05-16')), false);
  assert.strictEqual(canBook(existing, new Booking('c', '2024-05-01', '2024-05-10')), true);
});

test('touching ranges do not overlap in either order', () => {
  const a = new Booking('a', '2024-01-01', '2024-01-03'), b = new Booking('b', '2024-01-03', '2024-01-04');
  assert.strictEqual(overlaps(a, b), false);
  assert.strictEqual(overlaps(b, a), false);
});

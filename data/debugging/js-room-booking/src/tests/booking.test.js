const { Booking } = require('../models/booking');
const { canBook, price } = require('../services/booking');

test('back-to-back stays are allowed', () => {
  const existing = [new Booking('ana', '2024-03-01', '2024-03-05')];
  assert.strictEqual(canBook(existing, new Booking('ben', '2024-03-05', '2024-03-07')), true);
});

test('price across a month end', () => {
  assert.strictEqual(price(new Booking('cy', '2024-01-30', '2024-02-02'), 10000), 30000);
});

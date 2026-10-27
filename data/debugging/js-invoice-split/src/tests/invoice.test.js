const { LineItem } = require('../models/line-item');
const { invoiceTotal, splitEvenly } = require('../services/invoice');

test('a $19.99 item costs 1999 cents', () => {
  assert.strictEqual(invoiceTotal([new LineItem('Book', 19.99)], 0).subtotal, 1999);
});

test('three-way split of $100', () => {
  assert.deepStrictEqual(splitEvenly(10000, 3), [3334, 3333, 3333]);
});

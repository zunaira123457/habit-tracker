const { LineItem } = require('../models/line-item');
const { invoiceTotal, splitEvenly } = require('../services/invoice');
const { toCents } = require('../utils/currency');

test('toCents', () => {
  assert.deepStrictEqual([0.29, 1.15, 4.35, 0.07, 10].map(toCents), [29, 115, 435, 7, 1000]);
});

test('invoice with tax', () => {
  const r = invoiceTotal([new LineItem('A', 19.99, 2), new LineItem('B', 0.29, 1)], 0.0725);
  assert.deepStrictEqual(r, { subtotal: 4027, tax: 292, total: 4319, display: '$43.19' });
});

test('splits always add up', () => {
  for (const [total, n] of [[101, 4], [5, 3], [999, 7], [1200, 4]]) {
    const shares = splitEvenly(total, n);
    assert.strictEqual(shares.reduce((a, b) => a + b, 0), total, `${total} split ${n} ways`);
    assert.ok(Math.max(...shares) - Math.min(...shares) <= 1, `${shares}`);
  }
});

test('extra cents go to the first people', () => {
  assert.deepStrictEqual(splitEvenly(10, 4), [3, 3, 2, 2]);
});

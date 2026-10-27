const { Cart } = require('../services/cart');
const { CATALOG } = require('../models/catalog');
const { formatCents } = require('../utils/money');

test('catalog is never modified', () => {
  const c = new Cart();
  c.add('milk', 4);
  assert.strictEqual(CATALOG.milk.qty, undefined, 'catalog item got a qty');
});

test('receipt', () => {
  const c = new Cart();
  c.add('bread');
  c.add('apple', 3);
  assert.deepStrictEqual(c.receipt(), ['1 x Bread', '3 x Apple', 'Total: $4.50']);
});

test('formatting', () => {
  assert.deepStrictEqual([formatCents(150), formatCents(1200), formatCents(5)], ['$1.50', '$12.00', '$0.05']);
});

test('separate carts after the same add', () => {
  const a = new Cart(), b = new Cart();
  a.add('bread', 1);
  b.add('bread', 1);
  a.add('bread', 1);
  assert.deepStrictEqual([a.total(), b.total()], [600, 300]);
});

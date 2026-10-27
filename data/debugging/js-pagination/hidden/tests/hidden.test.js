const { Product } = require('../models/product');
const { listProducts } = require('../services/products');
const { paginate } = require('../utils/paginate');

const products = [1, 2, 3, 4, 5, 6, 7].map(i => new Product(i, `P${i}`));

test('last partial page', () => {
  const r = listProducts(products, 3);
  assert.deepStrictEqual(r.items.map(p => p.id), [7]);
  assert.strictEqual(r.hasNext, false);
});

test('middle page', () => {
  const r = listProducts(products, 2);
  assert.deepStrictEqual(r.items.map(p => p.id), [4, 5, 6]);
  assert.deepStrictEqual([r.page, r.totalPages, r.hasNext], [2, 3, true]);
});

test('past the end is empty', () => {
  assert.deepStrictEqual(paginate([1, 2], 4, 2), []);
});

test('helper is 1-based', () => {
  assert.deepStrictEqual(paginate(['a', 'b', 'c', 'd'], 1, 2), ['a', 'b']);
});

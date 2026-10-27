const { Product } = require('../models/product');
const { listProducts } = require('../services/products');

const products = [1, 2, 3, 4, 5, 6, 7].map(i => new Product(i, `P${i}`));

test('page 1 starts at the first product', () => {
  assert.deepStrictEqual(listProducts(products, 1).items.map(p => p.id), [1, 2, 3]);
});

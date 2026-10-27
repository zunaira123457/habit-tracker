const { Cart } = require('../services/cart');

test('two carts with the same product stay separate', () => {
  const a = new Cart(), b = new Cart();
  a.add('apple', 2);
  b.add('apple', 1);
  a.add('apple', 3);
  assert.strictEqual(b.total(), 50, `cart B total was ${b.total()}`);
});

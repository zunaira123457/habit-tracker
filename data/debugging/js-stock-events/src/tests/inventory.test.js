const { Inventory } = require('../services/inventory');

test('every listener hears the first low-stock alert', () => {
  const inv = new Inventory();
  const heard = [];
  inv.once('low-stock', () => heard.push('onboarding hook'));
  inv.on('low-stock', sku => heard.push(`warehouse: ${sku}`));
  inv.add('tape', 6);
  inv.remove('tape', 3);
  assert.deepStrictEqual(heard, ['onboarding hook', 'warehouse: tape']);
});

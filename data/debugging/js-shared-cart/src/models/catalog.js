const CATALOG = {
  apple: { sku: 'apple', name: 'Apple', price: 50 },
  bread: { sku: 'bread', name: 'Bread', price: 300 },
  milk: { sku: 'milk', name: 'Milk', price: 125 },
};

function getProduct(sku) {
  const product = CATALOG[sku];
  if (!product) throw new Error(`Unknown product: ${sku}`);
  return product;
}

module.exports = { getProduct, CATALOG };

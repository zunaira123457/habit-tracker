const { getProduct } = require('../models/catalog');
const { formatCents } = require('../utils/money');

class Cart {
  constructor() {
    this.lines = [];
  }

  add(sku, qty = 1) {
    const existing = this.lines.find(l => l.sku === sku);
    if (existing) {
      existing.qty += qty;
      return;
    }
    const line = getProduct(sku);
    line.qty = qty;
    this.lines.push(line);
  }

  total() {
    return this.lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  }

  receipt() {
    return this.lines.map(l => `${l.qty} x ${l.name}`).concat(`Total: ${formatCents(this.total())}`);
  }
}

module.exports = { Cart };

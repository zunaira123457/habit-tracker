const { Emitter } = require('../utils/emitter');
const { StockItem } = require('../models/stock-item');

const LOW_STOCK = 5;

class Inventory extends Emitter {
  constructor() {
    super();
    this.items = new Map();
  }

  add(sku, quantity) {
    this.items.set(sku, new StockItem(sku, quantity));
  }

  remove(sku, quantity) {
    const item = this.items.get(sku);
    item.quantity -= quantity;
    if (item.quantity < LOW_STOCK) this.emit('low-stock', item.sku, item.quantity);
  }
}

module.exports = { Inventory };

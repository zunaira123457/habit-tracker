class LineItem {
  constructor(description, price, qty = 1) {
    this.description = description;
    this.price = price; // dollars, e.g. 19.99
    this.qty = qty;
  }
}

module.exports = { LineItem };

const { validateAmount } = require('../utils/validate');

class Bank {
  constructor(audit) {
    this.audit = audit;
    this.balances = new Map();
  }

  open(id, cents = 0) {
    this.balances.set(id, cents);
  }

  balance(id) {
    if (!this.balances.has(id)) throw new Error(`Unknown account: ${id}`);
    return this.balances.get(id);
  }

  async transfer(from, to, cents) {
    validateAmount(cents);
    if (this.balance(from) < cents) throw new Error('Insufficient funds');
    this.balances.set(from, this.balance(from) - cents);
    this.balances.set(to, this.balance(to) + cents);
    await this.audit.log({ from, to, cents });
  }

  total() {
    return [...this.balances.values()].reduce((a, b) => a + b, 0);
  }
}

module.exports = { Bank };

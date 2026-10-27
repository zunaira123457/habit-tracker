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
    const fromBalance = this.balance(from);
    const toBalance = this.balance(to);
    if (fromBalance < cents) throw new Error('Insufficient funds');
    await this.audit.log({ from, to, cents });
    this.balances.set(from, fromBalance - cents);
    this.balances.set(to, toBalance + cents);
  }

  total() {
    return [...this.balances.values()].reduce((a, b) => a + b, 0);
  }
}

module.exports = { Bank };

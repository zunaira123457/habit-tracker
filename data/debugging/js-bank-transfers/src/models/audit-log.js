class AuditLog {
  constructor() {
    this.entries = [];
  }

  async log(entry) {
    await new Promise(r => setTimeout(r, 1)); // simulated network write
    this.entries.push(entry);
  }
}

module.exports = { AuditLog };

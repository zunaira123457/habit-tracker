const { AuditLog } = require('../models/audit-log');
const { Bank } = require('../services/bank');

test('parallel payroll debits the company for every transfer', async () => {
  const bank = new Bank(new AuditLog());
  bank.open('company', 10000);
  ['ana', 'ben', 'cy'].forEach(id => bank.open(id));
  await Promise.all(['ana', 'ben', 'cy'].map(id => bank.transfer('company', id, 1000)));
  assert.strictEqual(bank.balance('company'), 7000);
  assert.strictEqual(bank.total(), 10000, 'money was created or destroyed');
});

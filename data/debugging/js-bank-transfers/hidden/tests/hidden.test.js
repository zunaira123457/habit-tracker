const { AuditLog } = require('../models/audit-log');
const { Bank } = require('../services/bank');

function setup() {
  const audit = new AuditLog();
  const bank = new Bank(audit);
  bank.open('a', 500);
  bank.open('b', 500);
  return { bank, audit };
}

test('concurrent transfers in both directions keep the total', async () => {
  const { bank, audit } = setup();
  await Promise.all([bank.transfer('a', 'b', 100), bank.transfer('b', 'a', 50), bank.transfer('a', 'b', 25)]);
  assert.deepStrictEqual([bank.balance('a'), bank.balance('b')], [425, 575]);
  assert.strictEqual(audit.entries.length, 3);
});

test('cannot overdraw with concurrent transfers', async () => {
  const { bank } = setup();
  const results = await Promise.allSettled([bank.transfer('a', 'b', 300), bank.transfer('a', 'b', 300)]);
  assert.deepStrictEqual(results.map(r => r.status).sort(), ['fulfilled', 'rejected']);
  assert.deepStrictEqual([bank.balance('a'), bank.balance('b')], [200, 800]);
});

test('invalid amounts are rejected and change nothing', async () => {
  const { bank, audit } = setup();
  for (const amount of [0, -5, 10.5, '100', NaN]) {
    await assert.rejects(() => bank.transfer('a', 'b', amount), /Invalid amount/);
  }
  assert.deepStrictEqual([bank.balance('a'), bank.balance('b'), audit.entries.length], [500, 500, 0]);
});

test('insufficient funds', async () => {
  const { bank } = setup();
  await assert.rejects(() => bank.transfer('a', 'b', 501), /Insufficient funds/);
  assert.strictEqual(bank.balance('a'), 500);
});

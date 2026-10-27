const { Person } = require('../models/person');
const { sortedDirectory } = require('../services/directory');
const { byName } = require('../utils/compare');

test('ties broken by first name', () => {
  const people = [new Person('Sam', 'Lee'), new Person('Ana', 'Lee'), new Person('Bo', 'Cruz')];
  assert.deepStrictEqual(sortedDirectory(people), ['Cruz, Bo', 'Lee, Ana', 'Lee, Sam']);
});

test('comparator returns a number with the right sign', () => {
  const a = new Person('A', 'Able'), b = new Person('B', 'Baker');
  assert.ok(byName(a, b) < 0, 'Able should sort before Baker');
  assert.ok(byName(b, a) > 0, 'Baker should sort after Able');
  assert.strictEqual(byName(a, new Person('A', 'Able')), 0);
});

test('does not modify input', () => {
  const people = [new Person('Z', 'Zed'), new Person('A', 'Ant')];
  sortedDirectory(people);
  assert.strictEqual(people[0].lastName, 'Zed');
});

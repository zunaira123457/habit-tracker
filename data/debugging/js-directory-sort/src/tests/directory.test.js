const { Person } = require('../models/person');
const { sortedDirectory } = require('../services/directory');

test('alphabetical by last name', () => {
  const people = [new Person('Zoe', 'Young'), new Person('Ana', 'Brown'), new Person('Max', 'Ng'), new Person('Ivy', 'Adams')];
  assert.deepStrictEqual(sortedDirectory(people), ['Adams, Ivy', 'Brown, Ana', 'Ng, Max', 'Young, Zoe']);
});

const { byName } = require('../utils/compare');

function sortedDirectory(people) {
  return [...people].sort(byName).map(p => `${p.lastName}, ${p.firstName}`);
}

module.exports = { sortedDirectory };

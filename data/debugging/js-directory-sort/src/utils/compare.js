// Sort by last name, then first name.
function byName(a, b) {
  return a.lastName > b.lastName;
}

module.exports = { byName };

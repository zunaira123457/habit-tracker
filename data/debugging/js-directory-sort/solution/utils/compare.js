// Sort by last name, then first name.
function byName(a, b) {
  return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
}

module.exports = { byName };

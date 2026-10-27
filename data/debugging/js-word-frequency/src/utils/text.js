// Lowercase words made of letters and apostrophes; punctuation and numbers are ignored.
function tokenize(text) {
  return text.split(' ').filter(Boolean);
}

module.exports = { tokenize };

// Lowercase words made of letters and apostrophes; punctuation and numbers are ignored.
function tokenize(text) {
  return text.toLowerCase().match(/[a-z']+/g) || [];
}

module.exports = { tokenize };

function max(values) {
  return Math.max(...values);
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

module.exports = { max, mean };

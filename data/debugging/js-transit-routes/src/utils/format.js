function formatRoute(path) {
  return path ? path.join(' → ') : 'No route';
}

module.exports = { formatRoute };

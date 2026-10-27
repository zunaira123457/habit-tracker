// Pages are 1-based.
function paginate(items, page, pageSize) {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

function pageCount(items, pageSize) {
  return Math.ceil(items.length / pageSize);
}

module.exports = { paginate, pageCount };

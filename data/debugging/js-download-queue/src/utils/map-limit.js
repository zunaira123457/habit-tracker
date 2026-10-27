const { TaskQueue } = require('../services/queue');

// Map with at most `limit` calls of fn running at once. Results keep the order of `items`.
async function mapLimit(items, limit, fn) {
  const queue = new TaskQueue(limit);
  const results = [];
  await Promise.all(items.map(item => queue.push(() => fn(item)).then(r => results.push(r))));
  return results;
}

module.exports = { mapLimit };

const { completed } = require('../services/todos');

function summary(todos) {
  return `${completed(todos).length} of ${todos.length} done`;
}

module.exports = { summary };

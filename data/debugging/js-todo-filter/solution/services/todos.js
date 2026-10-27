function completed(todos) {
  return todos.filter(t => t.done === true);
}

function pending(todos) {
  return todos.filter(t => !t.done);
}

module.exports = { completed, pending };

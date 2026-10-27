const { Todo } = require('../models/todo');
const { completed, pending } = require('../services/todos');

test('viewing completed items does not change pending ones', () => {
  const todos = [new Todo('Buy milk', true), new Todo('Call mom'), new Todo('Pay rent')];
  completed(todos);
  assert.deepStrictEqual(pending(todos).map(t => t.title), ['Call mom', 'Pay rent']);
});

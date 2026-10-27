const { Todo } = require('../models/todo');
const { completed, pending } = require('../services/todos');
const { summary } = require('../utils/format');

test('completed returns only done items', () => {
  const todos = [new Todo('a'), new Todo('b', true), new Todo('c'), new Todo('d', true)];
  assert.deepStrictEqual(completed(todos).map(t => t.title), ['b', 'd']);
});

test('summary', () => {
  const todos = [new Todo('a', true), new Todo('b'), new Todo('c', true), new Todo('d'), new Todo('e')];
  assert.strictEqual(summary(todos), '2 of 5 done');
  assert.strictEqual(todos.filter(t => t.done).length, 2, 'summary changed the to-dos');
});

test('empty list', () => {
  assert.deepStrictEqual(completed([]), []);
});

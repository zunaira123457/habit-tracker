# Everything is done?

A to-do app shows tabs for completed and pending items, plus a summary line.

## Files
- `models/todo.js`: a `Todo` with a title and a `done` flag
- `services/todos.js`: `completed(todos)` and `pending(todos)`
- `utils/format.js`: the summary line, e.g. `2 of 5 done`

## Expected behavior
- `completed` returns the done items and `pending` returns the rest, both in their original order.
- Viewing a list never changes the to-dos.

## Bug report
> As soon as I open the Completed tab, every task gets marked as done and my Pending tab is empty.

There is **1 bug**.

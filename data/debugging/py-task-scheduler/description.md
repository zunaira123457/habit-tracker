# Build task scheduler

A build tool runs tasks in an order that respects their dependencies.

## Files
- `models/task.py`: a `Task` with a name and the names it depends on
- `services/planner.py`: turns `Task` objects into a build plan
- `services/scheduler.py`: topological sort (Kahn's algorithm)
- `utils/graph.py`: builds the dependency graph and in-degree counts

## Expected behavior
- `schedule(tasks, deps)` returns **every** task, with each task after everything it depends on. `deps` is a list of `(before, after)` pairs.
- When several tasks are ready at once, they run in the order they were listed.
- The same dependency listed twice is the same as listing it once.
- A dependency cycle raises `ValueError`. Never return a partial plan.

## Bug report
> When `test` was listed as depending on `build` in two config files, `test` and `deploy` silently disappeared from the plan. And a typo that created a cycle produced a half-finished plan instead of an error.

There are **2 bugs**.

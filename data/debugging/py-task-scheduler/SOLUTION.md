# Solution

## Bug 1: duplicate dependencies counted twice, in `utils/graph.py`
The graph stores each edge once (a dict used as an ordered set), but the in-degree was incremented for **every** pair, including duplicates. A task with a duplicated dependency needed two decrements to become ready, but only one edge pointed at it, so it (and everything after it) never ran.

**Fix:** only count an edge the first time it's added (`if after not in graph[before]`).

**Root cause vs. symptom:** the symptom shows up in `services/scheduler.py`. Deduplicating `deps` in the planner hides it for that caller only; the graph builder still produces inconsistent counts.

## Bug 2: no cycle check, in `services/scheduler.py`
Kahn's algorithm can't schedule tasks on a cycle; they never reach in-degree 0. The function returned whatever it had scheduled so far.

**Fix:** if `len(order) != len(tasks)`, raise `ValueError`.

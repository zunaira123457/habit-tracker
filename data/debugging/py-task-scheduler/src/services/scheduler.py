from collections import deque

from utils.graph import build_graph


def schedule(tasks, deps):
    """Every task, each after its dependencies. Ties keep the listed order. Cycles raise ValueError."""
    graph, indegree = build_graph(tasks, deps)
    ready = deque(t for t in tasks if indegree[t] == 0)
    order = []
    while ready:
        t = ready.popleft()
        order.append(t)
        for nxt in graph[t]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                ready.append(nxt)
    return order

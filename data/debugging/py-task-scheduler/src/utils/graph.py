def build_graph(tasks, deps):
    """Adjacency (ordered, no duplicate edges) and in-degree for each task."""
    graph = {t: {} for t in tasks}
    indegree = {t: 0 for t in tasks}
    for before, after in deps:
        graph[before][after] = True
        indegree[after] += 1
    return graph, indegree

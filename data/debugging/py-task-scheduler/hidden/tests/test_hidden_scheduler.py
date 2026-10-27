from services.scheduler import schedule
from utils.graph import build_graph


def test_simple_order():
    assert schedule(["c", "b", "a"], [("a", "b"), ("b", "c")]) == ["a", "b", "c"]


def test_ties_keep_listed_order():
    assert schedule(["lint", "fmt", "build"], [("lint", "build"), ("fmt", "build")]) == ["lint", "fmt", "build"]


def test_duplicates():
    order = schedule(["a", "b", "c"], [("a", "b"), ("a", "b"), ("b", "c")])
    assert order == ["a", "b", "c"], order


def test_graph_counts_each_edge_once():
    _, indegree = build_graph(["x", "y"], [("x", "y"), ("x", "y")])
    assert indegree == {"x": 0, "y": 1}, indegree


def test_cycle_raises():
    try:
        result = schedule(["a", "b", "c"], [("a", "b"), ("b", "c"), ("c", "b")])
    except ValueError:
        return
    assert False, f"expected ValueError, got {result}"

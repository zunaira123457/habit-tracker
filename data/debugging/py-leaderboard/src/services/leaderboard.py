import heapq

from utils.ranking import rank_label


def top_players(players, k):
    """Names of the k highest-scoring players, best first (ties alphabetical)."""
    heap = []
    for p in players:
        heapq.heappush(heap, (p.score, p.name))
    best = [heapq.heappop(heap) for _ in range(k)]
    return [name for _, name in best]


def leaderboard_lines(players, k):
    scores = {p.name: p.score for p in players}
    return [f"{rank_label(i + 1)} {name} ({scores[name]})" for i, name in enumerate(top_players(players, k))]

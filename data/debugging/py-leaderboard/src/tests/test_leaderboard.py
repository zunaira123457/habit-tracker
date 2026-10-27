from models.player import Player
from services.leaderboard import top_players


def test_best_player_first():
    players = [Player("Ana", 300), Player("Ben", 900), Player("Cy", 500)]
    assert top_players(players, 2) == ["Ben", "Cy"], top_players(players, 2)

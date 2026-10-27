from models.player import Player
from services.leaderboard import leaderboard_lines, top_players


def test_ties_alphabetical():
    players = [Player("Zed", 50), Player("Amy", 50), Player("Lou", 70)]
    assert top_players(players, 3) == ["Lou", "Amy", "Zed"], top_players(players, 3)


def test_fewer_players_than_k():
    players = [Player("Ana", 1), Player("Ben", 2)]
    assert top_players(players, 5) == ["Ben", "Ana"], top_players(players, 5)


def test_no_players():
    assert top_players([], 3) == []


def test_lines():
    players = [Player("Mia", 980), Player("Noah", 940)]
    assert leaderboard_lines(players, 2) == ["1st Mia (980)", "2nd Noah (940)"], leaderboard_lines(players, 2)

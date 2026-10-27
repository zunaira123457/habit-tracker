# Leaderboard top players

A game shows the top players at the end of each round.

## Files
- `models/player.py`: a `Player` with a name and score
- `services/leaderboard.py`: picks the top `k` players and builds display lines
- `utils/ranking.py`: turns a position into a label like `1st`, `2nd`, `11th`

## Expected behavior
- `top_players(players, k)` returns the names of the `k` highest scores, **best first**. Ties are broken alphabetically by name.
- If there are fewer than `k` players, return all of them.
- `leaderboard_lines` returns lines like `1st Mia (980)`.

## Bug report
> The leaderboard listed the lowest scores at the top. And when only two people played, asking for the top 3 crashed with `IndexError`.

There are **2 bugs**.

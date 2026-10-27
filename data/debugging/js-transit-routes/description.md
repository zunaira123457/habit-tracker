# Fewest stops

A transit app finds the route with the **fewest stops** between two stations.

## Files
- `models/network.js`: `Network`, a directed graph of stations (`connect(a, b)` adds a one-way link)
- `services/routes.js`: `shortestPath(network, start, goal)` using breadth-first search
- `utils/format.js`: `formatRoute(path)`, e.g. `A → B → C`

## Expected behavior
- `shortestPath` returns an array of stations from `start` to `goal` with the fewest links, or `null` if there's no route.
- When two routes tie, the one found first (following links in the order they were added) wins.
- Stations with no outgoing links (the end of a line) are valid stops.
- `formatRoute(null)` is `No route`.

## Bug report
> From Central to Airport the app suggested a 5-stop scenic route instead of the 2-stop express. Searching for a route to Harbor crashes with `TypeError: ... is not iterable`.

There are **2 bugs**, in different files.

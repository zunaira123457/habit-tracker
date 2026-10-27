// Breadth-first search: the route with the fewest links, or null.
function shortestPath(network, start, goal) {
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.pop();
    const station = path[path.length - 1];
    if (station === goal) return path;
    for (const next of network.neighbors(station)) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

module.exports = { shortestPath };

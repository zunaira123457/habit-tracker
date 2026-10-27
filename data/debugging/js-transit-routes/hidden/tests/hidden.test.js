const { Network } = require('../models/network');
const { shortestPath } = require('../services/routes');
const { formatRoute } = require('../utils/format');

test('end of the line is a valid stop', () => {
  const n = new Network().connect('A', 'B').connect('A', 'Harbor').connect('B', 'C');
  assert.deepStrictEqual(shortestPath(n, 'A', 'C'), ['A', 'B', 'C']);
});

test('station with no links at all', () => {
  assert.deepStrictEqual(shortestPath(new Network(), 'Lonely', 'Lonely'), ['Lonely']);
  assert.strictEqual(shortestPath(new Network(), 'Lonely', 'Elsewhere'), null);
});

test('fewest stops on a grid', () => {
  const n = new Network()
    .connect('s', 'a').connect('s', 'b')
    .connect('a', 'c').connect('c', 'd').connect('d', 'g')
    .connect('b', 'g');
  assert.deepStrictEqual(shortestPath(n, 's', 'g'), ['s', 'b', 'g']);
});

test('ties go to the first-added link', () => {
  const n = new Network().connect('s', 'x').connect('s', 'y').connect('x', 'g').connect('y', 'g');
  assert.deepStrictEqual(shortestPath(n, 's', 'g'), ['s', 'x', 'g']);
});

test('no route', () => {
  const n = new Network().connect('a', 'b').connect('c', 'd');
  assert.strictEqual(formatRoute(shortestPath(n, 'a', 'd')), 'No route');
});

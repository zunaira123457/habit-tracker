const { Network } = require('../models/network');
const { shortestPath } = require('../services/routes');
const { formatRoute } = require('../utils/format');

test('express route wins', () => {
  const n = new Network()
    .connect('Central', 'Express').connect('Central', 'Park')
    .connect('Express', 'Airport')
    .connect('Park', 'Museum').connect('Museum', 'Zoo').connect('Zoo', 'Mall').connect('Mall', 'Airport');
  assert.strictEqual(formatRoute(shortestPath(n, 'Central', 'Airport')), 'Central → Express → Airport');
});

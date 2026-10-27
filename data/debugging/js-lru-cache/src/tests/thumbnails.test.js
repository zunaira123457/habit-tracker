const { Image } = require('../models/image');
const { ThumbnailService } = require('../services/thumbnails');

test('flipping between two photos renders each once', () => {
  const svc = new ThumbnailService(2);
  const a = new Image('a', 800, 600), b = new Image('b', 640, 480), c = new Image('c', 100, 100);
  svc.thumbnail(a);
  svc.thumbnail(b);
  svc.thumbnail(a);
  svc.thumbnail(c); // should evict b, the least recently used
  svc.thumbnail(c); // c was just opened, so it must still be cached
  svc.thumbnail(a);
  assert.strictEqual(svc.renders, 3, `rendered ${svc.renders} times`);
});

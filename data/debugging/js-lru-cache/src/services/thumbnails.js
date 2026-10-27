const { LRUCache } = require('../utils/lru');

class ThumbnailService {
  constructor(capacity = 3) {
    this.cache = new LRUCache(capacity);
    this.renders = 0;
  }

  thumbnail(image) {
    const cached = this.cache.get(image.id);
    if (cached) return cached;
    this.renders++;
    const thumb = `thumb:${image.id}:${Math.round(image.width / 10)}x${Math.round(image.height / 10)}`;
    this.cache.set(image.id, thumb);
    return thumb;
  }
}

module.exports = { ThumbnailService };

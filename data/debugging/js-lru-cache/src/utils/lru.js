// Least-recently-used cache. A Map iterates in insertion order: first key = least recent.
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    return this.map.get(key);
  }

  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const evict = [...this.map.keys()].pop();
      this.map.delete(evict);
    }
  }

  has(key) {
    return this.map.has(key);
  }

  get size() {
    return this.map.size;
  }
}

module.exports = { LRUCache };

class Network {
  constructor() {
    this.edges = new Map();
  }

  connect(from, to) {
    if (!this.edges.has(from)) this.edges.set(from, []);
    this.edges.get(from).push(to);
    return this;
  }

  neighbors(station) {
    return this.edges.get(station) || [];
  }
}

module.exports = { Network };

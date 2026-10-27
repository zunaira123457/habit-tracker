const sleep = ms => new Promise(r => setTimeout(r, ms));

class FakeSearchApi {
  constructor(delays = {}) {
    this.delays = delays; // query -> ms
    this.calls = [];
  }

  async search(query) {
    this.calls.push(query);
    await sleep(this.delays[query] ?? 5);
    return [`${query}-1`, `${query}-2`];
  }
}

module.exports = { FakeSearchApi };

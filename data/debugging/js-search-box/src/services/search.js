const { debounce } = require('../utils/debounce');

class SearchBox {
  constructor(api, debounceMs = 20) {
    this.api = api;
    this.results = [];
    this.query = '';
  }

  async run(query) {
    this.query = query;
    const results = await this.api.search(query);
    this.results = results;
  }
}

function withDebounce(box, ms) {
  box.typed = debounce(q => box.run(q), ms);
  return box;
}

module.exports = { SearchBox, withDebounce };

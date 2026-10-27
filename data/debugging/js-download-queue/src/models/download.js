class Download {
  constructor(url, ms) {
    this.url = url;
    this.ms = ms;
  }

  filename() {
    return this.url.split('/').pop();
  }
}

module.exports = { Download };

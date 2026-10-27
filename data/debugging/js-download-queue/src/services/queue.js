class TaskQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.running = 0;
    this.waiting = [];
  }

  push(task) {
    return new Promise((resolve, reject) => {
      this.waiting.push({ task, resolve, reject });
      this._next();
    });
  }

  _next() {
    if (this.running >= this.concurrency || this.waiting.length === 0) return;
    const { task, resolve, reject } = this.waiting.shift();
    this.running++;
    task().then(resolve, reject);
    this.running--;
    this._next();
  }
}

module.exports = { TaskQueue };

class Emitter {
  constructor() {
    this.listeners = {};
  }

  on(event, fn) {
    (this.listeners[event] ||= []).push({ fn, once: false });
    return this;
  }

  once(event, fn) {
    (this.listeners[event] ||= []).push({ fn, once: true });
    return this;
  }

  off(event, fn) {
    const list = this.listeners[event];
    if (!list) return this;
    const i = list.findIndex(l => l.fn === fn);
    if (i >= 0) list.splice(i, 1);
    return this;
  }

  emit(event, ...args) {
    const list = [...(this.listeners[event] || [])];
    list.forEach(l => {
      if (l.once) this.off(event, l.fn);
      l.fn(...args);
    });
  }
}

module.exports = { Emitter };

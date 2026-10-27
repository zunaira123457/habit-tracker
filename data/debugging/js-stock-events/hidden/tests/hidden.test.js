const { Emitter } = require('../utils/emitter');

test('once runs once', () => {
  const e = new Emitter();
  let n = 0;
  e.once('x', () => n++);
  e.emit('x');
  e.emit('x');
  assert.strictEqual(n, 1);
});

test('listener removing itself does not skip the next one', () => {
  const e = new Emitter();
  const calls = [];
  const a = () => { calls.push('a'); e.off('x', a); };
  e.on('x', a).on('x', () => calls.push('b')).on('x', () => calls.push('c'));
  e.emit('x');
  e.emit('x');
  assert.deepStrictEqual(calls, ['a', 'b', 'c', 'b', 'c']);
});

test('two once listeners in a row both run', () => {
  const e = new Emitter();
  const calls = [];
  e.once('y', () => calls.push(1)).once('y', () => calls.push(2)).on('y', () => calls.push(3));
  e.emit('y');
  assert.deepStrictEqual(calls, [1, 2, 3]);
});

test('arguments are passed through', () => {
  const e = new Emitter();
  let got;
  e.on('z', (a, b) => { got = a + b; });
  e.emit('z', 2, 3);
  assert.strictEqual(got, 5);
});

(function () {
  const _ = typeof require === 'function' ? require('..') : window._;

  QUnit.module('Chaining');

  QUnit.test('map/flatten/reduce', assert => {
    const lyrics = [
      'I\'m a lumberjack and I\'m okay',
      'I sleep all night and I work all day',
      'He\'s a lumberjack and he\'s okay',
      'He sleeps all night and he works all day',
    ];
    const counts = _(lyrics).chain()
      .map(line => line.split(''))
      .flatten()
      .reduce((hash, l) => {
        hash[l] = hash[l] || 0;
        hash[l]++;
        return hash;
      }, {})
      .value();
    assert.equal(counts.a, 16, 'counted all the letters in the song');
    assert.equal(counts.e, 10, 'counted all the letters in the song');
  });

  QUnit.test('select/reject/sortBy', assert => {
    let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    numbers = _(numbers).chain().select(n => n % 2 === 0).reject(n => n % 4 === 0)
      .sortBy(n => -n)
      .value();
    assert.deepEqual(numbers, [10, 6, 2], 'filtered and reversed the numbers');
  });

  QUnit.test('select/reject/sortBy in functional style', assert => {
    let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    numbers = _.chain(numbers).select(n => n % 2 === 0).reject(n => n % 4 === 0).sortBy(n => -n)
      .value();
    assert.deepEqual(numbers, [10, 6, 2], 'filtered and reversed the numbers');
  });

  QUnit.test('reverse/concat/unshift/pop/map', assert => {
    let numbers = [1, 2, 3, 4, 5];
    numbers = _(numbers).chain()
      .reverse()
      .concat([5, 5, 5])
      .unshift(17)
      .pop()
      .map(n => n * 2)
      .value();
    assert.deepEqual(numbers, [34, 10, 8, 6, 4, 2, 10, 10], 'can chain together array functions.');
  });

  QUnit.test('splice', assert => {
    const instance = _([1, 2, 3, 4, 5]).chain();
    assert.deepEqual(instance.splice(1, 3).value(), [1, 5]);
    assert.deepEqual(instance.splice(1, 0).value(), [1, 5]);
    assert.deepEqual(instance.splice(1, 1).value(), [1]);
    assert.deepEqual(instance.splice(0, 1).value(), [], '#397 Can create empty array');
  });

  QUnit.test('shift', assert => {
    const instance = _([1, 2, 3]).chain();
    assert.deepEqual(instance.shift().value(), [2, 3]);
    assert.deepEqual(instance.shift().value(), [3]);
    assert.deepEqual(instance.shift().value(), [], '#397 Can create empty array');
  });

  QUnit.test('pop', assert => {
    const instance = _([1, 2, 3]).chain();
    assert.deepEqual(instance.pop().value(), [1, 2]);
    assert.deepEqual(instance.pop().value(), [1]);
    assert.deepEqual(instance.pop().value(), [], '#397 Can create empty array');
  });

  QUnit.test('chaining works in small stages', assert => {
    const o = _([1, 2, 3, 4]).chain();
    assert.deepEqual(o.filter(i => i < 3).value(), [1, 2]);
    assert.deepEqual(o.filter(i => i > 2).value(), [3, 4]);
  });

  QUnit.test('#1562: Engine proxies for chained functions', assert => {
    const wrapped = _(512);
    assert.strictEqual(wrapped.toJSON(), 512);
    assert.strictEqual(wrapped.valueOf(), 512);
    assert.strictEqual(+wrapped, 512);
    assert.strictEqual(wrapped.toString(), '512');
    assert.strictEqual(`${wrapped}`, '512');
  });
}());

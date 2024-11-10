(function () {
  /** Used as a safe reference for `undefined` in pre-ES5 environments. */
  let undefined;

  /** Used as the size to cover large array optimizations. */
  const LARGE_ARRAY_SIZE = 200;

  /** Used as a reference to the global object. */
  const root = (typeof global === 'object' && global) || this;

  /** Used for native method references. */
  const arrayProto = Array.prototype;

  /** Method and object shortcuts. */
  const { phantom } = root;
  const argv = root.process && process.argv;
  const document = !phantom && root.document;
  const { slice } = arrayProto;
  const { WeakMap } = root;

  /**
   * Math helpers.
   * @param x
   * @param y
   */
  const add = function (x, y) { return x + y; };
  const isEven = function (n) { return n % 2 == 0; };
  const isEvenIndex = function (n, index) { return isEven(index); };
  const square = function (n) { return n * n; };

  // Leak to avoid sporadic `noglobals` fails on Edge in Sauce Labs.
  root.msWDfn = undefined;

  /*--------------------------------------------------------------------------*/

  /** Load QUnit and extras. */
  const QUnit = root.QUnit || require('qunit-extras');

  /** Load stable Lodash. */
  let _ = root._ || require('../lodash.js');

  const convert = (function () {
    const baseConvert = root.fp || require('../fp/_baseConvert.js');
    if (!root.fp) {
      return function (name, func, options) {
        return baseConvert(_, name, func, options);
      };
    }
    return function (name, func, options) {
      if (typeof name === 'function') {
        options = func;
        func = name;
        name = undefined;
      }
      return name === undefined
        ? baseConvert(func, options)
        : baseConvert(_.runInContext(), options)[name];
    };
  }());

  const allFalseOptions = {
    cap: false,
    curry: false,
    fixed: false,
    immutable: false,
    rearg: false,
  };

  var fp = root.fp
    ? (fp = _.noConflict(), _ = root._, fp)
    : convert(_.runInContext());

  const mapping = root.mapping || require('../fp/_mapping.js');

  /*--------------------------------------------------------------------------*/

  /**
   * Skips a given number of tests with a passing result.
   * @private
   * @param {object} assert The QUnit assert object.
   * @param {number} [count] The number of tests to skip.
   */
  function skipAssert(assert, count) {
    count || (count = 1);
    while (count--) {
      assert.ok(true, 'test skipped');
    }
  }

  /*--------------------------------------------------------------------------*/

  if (argv) {
    console.log('Running lodash/fp tests.');
  }

  QUnit.module('convert module');

  (function () {
    QUnit.test('should work with `name` and `func`', assert => {
      assert.expect(2);

      const array = [1, 2, 3, 4];
      const remove = convert('remove', _.remove);
      const actual = remove(isEven)(array);

      assert.deepEqual(array, [1, 2, 3, 4]);
      assert.deepEqual(actual, [1, 3]);
    });

    QUnit.test('should work with `name`, `func`, and `options`', assert => {
      assert.expect(3);

      const array = [1, 2, 3, 4];
      const remove = convert('remove', _.remove, allFalseOptions);

      const actual = remove(array, (n, index) => isEven(index));

      assert.deepEqual(array, [2, 4]);
      assert.deepEqual(actual, [1, 3]);
      assert.deepEqual(remove(), []);
    });

    QUnit.test('should work with an object', assert => {
      assert.expect(2);

      if (!document) {
        const array = [1, 2, 3, 4];
        const lodash = convert({ remove: _.remove });
        const actual = lodash.remove(isEven)(array);

        assert.deepEqual(array, [1, 2, 3, 4]);
        assert.deepEqual(actual, [1, 3]);
      } else {
        skipAssert(assert, 2);
      }
    });

    QUnit.test('should work with an object and `options`', assert => {
      assert.expect(3);

      if (!document) {
        const array = [1, 2, 3, 4];
        const lodash = convert({ remove: _.remove }, allFalseOptions);
        const actual = lodash.remove(array, isEvenIndex);

        assert.deepEqual(array, [2, 4]);
        assert.deepEqual(actual, [1, 3]);
        assert.deepEqual(lodash.remove(), []);
      } else {
        skipAssert(assert, 3);
      }
    });

    QUnit.test('should work with lodash and `options`', assert => {
      assert.expect(3);

      const array = [1, 2, 3, 4];
      const lodash = convert(_.runInContext(), allFalseOptions);
      const actual = lodash.remove(array, isEvenIndex);

      assert.deepEqual(array, [2, 4]);
      assert.deepEqual(actual, [1, 3]);
      assert.deepEqual(lodash.remove(), []);
    });

    QUnit.test('should work with `runInContext` and `options`', assert => {
      assert.expect(3);

      const array = [1, 2, 3, 4];
      const runInContext = convert('runInContext', _.runInContext, allFalseOptions);
      const lodash = runInContext();
      const actual = lodash.remove(array, isEvenIndex);

      assert.deepEqual(array, [2, 4]);
      assert.deepEqual(actual, [1, 3]);
      assert.deepEqual(lodash.remove(), []);
    });

    QUnit.test('should accept a variety of options', assert => {
      assert.expect(8);

      const array = [1, 2, 3, 4];
      let value = _.clone(array);
      let remove = convert('remove', _.remove, { cap: false });
      let actual = remove(isEvenIndex)(value);

      assert.deepEqual(value, [1, 2, 3, 4]);
      assert.deepEqual(actual, [2, 4]);

      remove = convert('remove', _.remove, { curry: false });
      actual = remove(isEven);

      assert.deepEqual(actual, []);

      const trim = convert('trim', _.trim, { fixed: false });
      assert.strictEqual(trim('_-abc-_', '_-'), 'abc');

      value = _.clone(array);
      remove = convert('remove', _.remove, { immutable: false });
      actual = remove(isEven)(value);

      assert.deepEqual(value, [1, 3]);
      assert.deepEqual(actual, [2, 4]);

      value = _.clone(array);
      remove = convert('remove', _.remove, { rearg: false });
      actual = remove(value)(isEven);

      assert.deepEqual(value, [1, 2, 3, 4]);
      assert.deepEqual(actual, [1, 3]);
    });

    QUnit.test('should respect the `cap` option', assert => {
      assert.expect(1);

      const iteratee = convert('iteratee', _.iteratee, { cap: false });

      const func = iteratee((a, b, c) => [a, b, c], 3);

      assert.deepEqual(func(1, 2, 3), [1, 2, 3]);
    });

    QUnit.test('should respect the `rearg` option', assert => {
      assert.expect(1);

      const add = convert('add', _.add, { rearg: true });

      assert.strictEqual(add('2')('1'), '12');
    });

    QUnit.test('should add a `placeholder` property', assert => {
      assert.expect(2);

      if (!document) {
        const lodash = convert({ add: _.add });

        assert.strictEqual(lodash.placeholder, lodash);
        assert.strictEqual(lodash.add.placeholder, lodash);
      } else {
        skipAssert(assert, 2);
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('method.convert');

  (function () {
    QUnit.test('should exist on unconverted methods', assert => {
      assert.expect(2);

      const array = [];
      const isArray = fp.isArray.convert({ curry: true });

      assert.strictEqual(fp.isArray(array), true);
      assert.strictEqual(isArray()(array), true);
    });

    QUnit.test('should convert method aliases', assert => {
      assert.expect(1);

      const all = fp.all.convert({ rearg: false });
      const actual = all([0])(_.identity);

      assert.strictEqual(actual, false);
    });

    QUnit.test('should convert remapped methods', assert => {
      assert.expect(1);

      const extendAll = fp.extendAll.convert({ immutable: false });
      const object = {};

      extendAll([object, { a: 1 }, { b: 2 }]);
      assert.deepEqual(object, { a: 1, b: 2 });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('convert methods');

  _.each(['fp.convert', 'method.convert'], methodName => {
    const isFp = methodName == 'fp.convert';
    const func = isFp ? fp.convert : fp.remove.convert;

    QUnit.test(`\`${methodName}\` should work with an object`, assert => {
      assert.expect(3);

      const array = [1, 2, 3, 4];
      const lodash = func(allFalseOptions);
      const remove = isFp ? lodash.remove : lodash;
      const actual = remove(array, isEvenIndex);

      assert.deepEqual(array, [2, 4]);
      assert.deepEqual(actual, [1, 3]);
      assert.deepEqual(remove(), []);
    });

    QUnit.test(`\`${methodName}\` should extend existing configs`, assert => {
      assert.expect(2);

      const array = [1, 2, 3, 4];
      const lodash = func({ cap: false });
      const remove = (isFp ? lodash.remove : lodash).convert({ rearg: false });
      const actual = remove(array)(isEvenIndex);

      assert.deepEqual(array, [1, 2, 3, 4]);
      assert.deepEqual(actual, [2, 4]);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('method arity checks');

  (function () {
    QUnit.test('should wrap methods with an arity > `1`', assert => {
      assert.expect(1);

      const methodNames = _.filter(_.functions(fp), methodName => fp[methodName].length > 1);

      assert.deepEqual(methodNames, []);
    });

    QUnit.test('should have >= arity of `aryMethod` designation', assert => {
      assert.expect(4);

      _.times(4, index => {
        const aryCap = index + 1;

        const methodNames = _.filter(mapping.aryMethod[aryCap], methodName => {
          const key = _.get(mapping.remap, methodName, methodName);
          const arity = _[key].length;

          return arity != 0 && arity < aryCap;
        });

        assert.deepEqual(methodNames, [], `\`aryMethod[${aryCap}]\``);
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('method aliases');

  (function () {
    QUnit.test('should have correct aliases', assert => {
      assert.expect(1);

      const actual = _.transform(mapping.aliasToReal, (result, realName, alias) => {
        result.push([alias, fp[alias] === fp[realName]]);
      }, []);

      assert.deepEqual(_.reject(actual, 1), []);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('method ary caps');

  (function () {
    QUnit.test('should have a cap of 1', assert => {
      assert.expect(1);

      const funcMethods = [
        'curry', 'iteratee', 'memoize', 'over', 'overEvery', 'overSome',
        'method', 'methodOf', 'rest', 'runInContext',
      ];

      const exceptions = funcMethods.concat('mixin', 'nthArg', 'template');
      const expected = _.map(mapping.aryMethod[1], _.constant(true));

      const actual = _.map(mapping.aryMethod[1], methodName => {
        const arg = _.includes(funcMethods, methodName) ? _.noop : 1;
        const result = _.attempt(() => fp[methodName](arg));

        if (_.includes(exceptions, methodName)
          ? typeof result === 'function'
          : typeof result !== 'function'
        ) {
          return true;
        }
        console.log(methodName, result);
        return false;
      });

      assert.deepEqual(actual, expected);
    });

    QUnit.test('should have a cap of 2', assert => {
      assert.expect(1);

      const funcMethods = [
        'after', 'ary', 'before', 'bind', 'bindKey', 'curryN', 'debounce',
        'delay', 'overArgs', 'partial', 'partialRight', 'rearg', 'throttle',
        'wrap',
      ];

      const exceptions = _.without(funcMethods.concat('matchesProperty'), 'delay');
      const expected = _.map(mapping.aryMethod[2], _.constant(true));

      const actual = _.map(mapping.aryMethod[2], methodName => {
        const args = _.includes(funcMethods, methodName) ? [methodName == 'curryN' ? 1 : _.noop, _.noop] : [1, []];
        const result = _.attempt(() => fp[methodName](args[0])(args[1]));

        if (_.includes(exceptions, methodName)
          ? typeof result === 'function'
          : typeof result !== 'function'
        ) {
          return true;
        }
        console.log(methodName, result);
        return false;
      });

      assert.deepEqual(actual, expected);
    });

    QUnit.test('should have a cap of 3', assert => {
      assert.expect(1);

      const funcMethods = [
        'assignWith', 'extendWith', 'isEqualWith', 'isMatchWith', 'reduce',
        'reduceRight', 'transform', 'zipWith',
      ];

      const expected = _.map(mapping.aryMethod[3], _.constant(true));

      const actual = _.map(mapping.aryMethod[3], methodName => {
        const args = _.includes(funcMethods, methodName) ? [_.noop, 0, 1] : [0, 1, []];
        const result = _.attempt(() => fp[methodName](args[0])(args[1])(args[2]));

        if (typeof result !== 'function') {
          return true;
        }
        console.log(methodName, result);
        return false;
      });

      assert.deepEqual(actual, expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('methods that use `indexOf`');

  (function () {
    QUnit.test('should work with `fp.indexOf`', assert => {
      assert.expect(10);

      const array = ['a', 'b', 'c'];
      const other = ['b', 'd', 'b'];
      const object = { a: 1, b: 2, c: 2 };
      let actual = fp.difference(array)(other);

      assert.deepEqual(actual, ['a', 'c'], 'fp.difference');

      actual = fp.includes('b')(array);
      assert.strictEqual(actual, true, 'fp.includes');

      actual = fp.intersection(other)(array);
      assert.deepEqual(actual, ['b'], 'fp.intersection');

      actual = fp.omit(other)(object);
      assert.deepEqual(actual, { a: 1, c: 2 }, 'fp.omit');

      actual = fp.union(other)(array);
      assert.deepEqual(actual, ['a', 'b', 'c', 'd'], 'fp.union');

      actual = fp.uniq(other);
      assert.deepEqual(actual, ['b', 'd'], 'fp.uniq');

      actual = fp.uniqBy(_.identity, other);
      assert.deepEqual(actual, ['b', 'd'], 'fp.uniqBy');

      actual = fp.without(other)(array);
      assert.deepEqual(actual, ['a', 'c'], 'fp.without');

      actual = fp.xor(other)(array);
      assert.deepEqual(actual, ['a', 'c', 'd'], 'fp.xor');

      actual = fp.pull('b')(array);
      assert.deepEqual(actual, ['a', 'c'], 'fp.pull');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('cherry-picked methods');

  (function () {
    QUnit.test('should provide the correct `iteratee` arguments', assert => {
      assert.expect(4);

      let args;
      const array = [1, 2, 3];
      const object = { a: 1, b: 2 };
      const isFIFO = _.keys(object)[0] == 'a';
      const map = convert('map', _.map);
      const reduce = convert('reduce', _.reduce);

      map(function () {
        args || (args = slice.call(arguments));
      })(array);

      assert.deepEqual(args, [1]);

      args = undefined;
      map(function () {
        args || (args = slice.call(arguments));
      })(object);

      assert.deepEqual(args, isFIFO ? [1] : [2]);

      args = undefined;
      reduce(function () {
        args || (args = slice.call(arguments));
      })(0)(array);

      assert.deepEqual(args, [0, 1]);

      args = undefined;
      reduce(function () {
        args || (args = slice.call(arguments));
      })(0)(object);

      assert.deepEqual(args, isFIFO ? [0, 1] : [0, 2]);
    });

    QUnit.test('should not support shortcut fusion', assert => {
      assert.expect(3);

      const array = fp.range(0, LARGE_ARRAY_SIZE);
      let filterCount = 0;
      let mapCount = 0;

      const iteratee = function (value) {
        mapCount++;
        return value * value;
      };

      const predicate = function (value) {
        filterCount++;
        return isEven(value);
      };

      const map1 = convert('map', _.map);
      const filter1 = convert('filter', _.filter);
      const take1 = convert('take', _.take);

      const filter2 = filter1(predicate);
      const map2 = map1(iteratee);
      const take2 = take1(2);

      const combined = fp.flow(map2, filter2, fp.compact, take2);

      assert.deepEqual(combined(array), [4, 16]);
      assert.strictEqual(filterCount, 200, 'filterCount');
      assert.strictEqual(mapCount, 200, 'mapCount');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('iteratee shorthands');

  (function () {
    const objects = [{ a: 1, b: 2 }, { a: 3, b: 4 }];

    QUnit.test('should work with "_.matches" shorthands', assert => {
      assert.expect(1);

      assert.deepEqual(fp.filter({ a: 3 })(objects), [objects[1]]);
    });

    QUnit.test('should work with "_.matchesProperty" shorthands', assert => {
      assert.expect(1);

      assert.deepEqual(fp.filter(['a', 3])(objects), [objects[1]]);
    });

    QUnit.test('should work with "_.property" shorthands', assert => {
      assert.expect(1);

      assert.deepEqual(fp.map('a')(objects), [1, 3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('placeholder methods');

  (function () {
    QUnit.test('should use `fp` as the default placeholder', assert => {
      assert.expect(3);

      let actual = fp.add(fp, 'b')('a');
      assert.strictEqual(actual, 'ab');

      actual = fp.fill(fp, 2)(1, '*')([1, 2, 3]);
      assert.deepEqual(actual, [1, '*', 3]);

      actual = fp.slice(fp, 2)(1)(['a', 'b', 'c']);
      assert.deepEqual(actual, ['b']);
    });

    QUnit.test('should support `fp.placeholder`', assert => {
      assert.expect(6);

      _.each([[], fp.__], ph => {
        fp.placeholder = ph;

        let actual = fp.add(ph, 'b')('a');
        assert.strictEqual(actual, 'ab');

        actual = fp.fill(ph, 2)(1, '*')([1, 2, 3]);
        assert.deepEqual(actual, [1, '*', 3]);

        actual = fp.slice(ph, 2)(1)(['a', 'b', 'c']);
        assert.deepEqual(actual, ['b']);
      });
    });

    const methodNames = [
      'bind',
      'bindKey',
      'curry',
      'curryRight',
      'partial',
      'partialRight',
    ];

    _.each(methodNames, methodName => {
      const func = fp[methodName];

      QUnit.test(`fp.${methodName}\` should have a \`placeholder\` property`, assert => {
        assert.expect(2);

        assert.ok(_.isObject(func.placeholder));
        assert.strictEqual(func.placeholder, fp.__);
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('setter methods');

  (function () {
    QUnit.test('should only clone objects in `path`', assert => {
      assert.expect(11);

      const object = { a: { b: 2, c: 3 }, d: { e: 4 } };
      let value = _.cloneDeep(object);
      let actual = fp.set('a.b.c.d', 5, value);

      assert.ok(_.isObject(actual.a.b), 'fp.set');
      assert.ok(_.isNumber(actual.a.b), 'fp.set');

      assert.strictEqual(actual.a.b.c.d, 5, 'fp.set');
      assert.strictEqual(actual.d, value.d, 'fp.set');

      value = _.cloneDeep(object);
      actual = fp.setWith(Object)('[0][1]')('a')(value);

      assert.deepEqual(actual[0], { 1: 'a' }, 'fp.setWith');

      value = _.cloneDeep(object);
      actual = fp.unset('a.b')(value);

      assert.notOk('b' in actual.a, 'fp.unset');
      assert.strictEqual(actual.a.c, value.a.c, 'fp.unset');

      value = _.cloneDeep(object);
      actual = fp.update('a.b')(square)(value);

      assert.strictEqual(actual.a.b, 4, 'fp.update');
      assert.strictEqual(actual.d, value.d, 'fp.update');

      value = _.cloneDeep(object);
      actual = fp.updateWith(Object)('[0][1]')(_.constant('a'))(value);

      assert.deepEqual(actual[0], { 1: 'a' }, 'fp.updateWith');
      assert.strictEqual(actual.d, value.d, 'fp.updateWith');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.add and fp.subtract');

  _.each(['add', 'subtract'], methodName => {
    const func = fp[methodName];
    const isAdd = methodName == 'add';

    QUnit.test(`\`fp.${methodName}\` should not have \`rearg\` applied`, assert => {
      assert.expect(1);

      assert.strictEqual(func('1')('2'), isAdd ? '12' : -1);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('object assignments');

  _.each(['assign', 'assignIn', 'defaults', 'defaultsDeep', 'merge'], methodName => {
    const func = fp[methodName];

    QUnit.test(`\`fp.${methodName}\` should not mutate values`, assert => {
      assert.expect(2);

      const object = { a: 1 };
      const actual = func(object)({ b: 2 });

      assert.deepEqual(object, { a: 1 });
      assert.deepEqual(actual, { a: 1, b: 2 });
    });
  });

  _.each(['assignAll', 'assignInAll', 'defaultsAll', 'defaultsDeepAll', 'mergeAll'], methodName => {
    const func = fp[methodName];

    QUnit.test(`\`fp.${methodName}\` should not mutate values`, assert => {
      assert.expect(2);

      const objects = [{ a: 1 }, { b: 2 }];
      const actual = func(objects);

      assert.deepEqual(objects[0], { a: 1 });
      assert.deepEqual(actual, { a: 1, b: 2 });
    });
  });

  _.each(['assignWith', 'assignInWith', 'extendWith'], methodName => {
    const func = fp[methodName];

    QUnit.test(`\`fp.${methodName}\` should provide the correct \`customizer\` arguments`, assert => {
      assert.expect(1);

      let args;

      func(function () {
        args || (args = _.map(arguments, _.cloneDeep));
      })({ a: 1 })({ b: 2 });

      assert.deepEqual(args, [undefined, 2, 'b', { a: 1 }, { b: 2 }]);
    });
  });

  _.each(['assignAllWith', 'assignInAllWith', 'extendAllWith', 'mergeAllWith'], methodName => {
    const func = fp[methodName];

    QUnit.test(`\`fp.${methodName}\` should not mutate values`, assert => {
      assert.expect(2);

      const objects = [{ a: 1 }, { b: 2 }];
      const actual = func(_.noop)(objects);

      assert.deepEqual(objects[0], { a: 1 });
      assert.deepEqual(actual, { a: 1, b: 2 });
    });

    QUnit.test(`\`fp.${methodName}\` should work with more than two sources`, assert => {
      assert.expect(2);

      let pass = false;
      const objects = [{ a: 1 }, { b: 2 }, { c: 3 }];
      const actual = func(() => { pass = true; })(objects);

      assert.ok(pass);
      assert.deepEqual(actual, { a: 1, b: 2, c: 3 });
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.castArray');

  (function () {
    QUnit.test('should shallow clone array values', assert => {
      assert.expect(2);

      const array = [1];
      const actual = fp.castArray(array);

      assert.deepEqual(actual, array);
      assert.notStrictEqual(actual, array);
    });

    QUnit.test('should not shallow clone non-array values', assert => {
      assert.expect(2);

      const object = { a: 1 };
      const actual = fp.castArray(object);

      assert.deepEqual(actual, [object]);
      assert.strictEqual(actual[0], object);
    });

    QUnit.test('should convert by name', assert => {
      assert.expect(4);

      const array = [1];
      const object = { a: 1 };
      const castArray = convert('castArray', _.castArray);
      let actual = castArray(array);

      assert.deepEqual(actual, array);
      assert.notStrictEqual(actual, array);

      actual = castArray(object);
      assert.deepEqual(actual, [object]);
      assert.strictEqual(actual[0], object);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('curry methods');

  _.each(['curry', 'curryRight'], methodName => {
    const func = fp[methodName];

    QUnit.test(`fp.${methodName}\` should only accept a \`func\` param`, assert => {
      assert.expect(1);

      assert.raises(() => { func(1, _.noop); }, TypeError);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('curryN methods');

  _.each(['curryN', 'curryRightN'], methodName => {
    const func = fp[methodName];

    QUnit.test(`fp.${methodName}\` should accept an \`arity\` param`, assert => {
      assert.expect(1);

      const actual = func(1)((a, b) => [a, b])('a');
      assert.deepEqual(actual, ['a', undefined]);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.defaultTo');

  (function () {
    QUnit.test('should have an argument order of `defaultValue` then `value`', assert => {
      assert.expect(2);

      assert.strictEqual(fp.defaultTo(1)(0), 0);
      assert.strictEqual(fp.defaultTo(1)(undefined), 1);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.difference');

  (function () {
    QUnit.test('should return the elements of the first array not included in the second array', assert => {
      assert.expect(1);

      const actual = fp.difference([2, 1], [2, 3]);
      assert.deepEqual(actual, [1]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.differenceBy');

  (function () {
    QUnit.test('should have an argument order of `iteratee`, `array`, then `values`', assert => {
      assert.expect(1);

      const actual = fp.differenceBy(Math.floor, [2.1, 1.2], [2.3, 3.4]);
      assert.deepEqual(actual, [1.2]);
    });

    QUnit.test('should provide the correct `iteratee` arguments', assert => {
      assert.expect(1);

      let args;

      fp.differenceBy(function () {
        args || (args = slice.call(arguments));
      })([2.1, 1.2], [2.3, 3.4]);

      assert.deepEqual(args, [2.3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.differenceWith');

  (function () {
    QUnit.test('should have an argument order of `comparator`, `array`, then `values`', assert => {
      assert.expect(1);

      const actual = fp.differenceWith(fp.eq)([2, 1])([2, 3]);
      assert.deepEqual(actual, [1]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.divide and fp.multiply');

  _.each(['divide', 'multiply'], methodName => {
    const func = fp[methodName];
    const isDivide = methodName == 'divide';

    QUnit.test(`\`fp.${methodName}\` should not have \`rearg\` applied`, assert => {
      assert.expect(1);

      assert.strictEqual(func('2')('4'), isDivide ? 0.5 : 8);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.extend');

  (function () {
    QUnit.test('should convert by name', assert => {
      assert.expect(2);

      /**
       *
       */
      function Foo() {}
      Foo.prototype = { b: 2 };

      const object = { a: 1 };
      const extend = convert('extend', _.extend);
      const actual = extend(object)(new Foo());

      assert.deepEqual(object, { a: 1 });
      assert.deepEqual(actual, { a: 1, b: 2 });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.fill');

  (function () {
    QUnit.test('should have an argument order of `start`, `end`, then `value`', assert => {
      assert.expect(1);

      const array = [1, 2, 3];
      assert.deepEqual(fp.fill(1)(2)('*')(array), [1, '*', 3]);
    });

    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const array = [1, 2, 3];
      const actual = fp.fill(1)(2)('*')(array);

      assert.deepEqual(array, [1, 2, 3]);
      assert.deepEqual(actual, [1, '*', 3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.findFrom methods');

  _.each(['findFrom', 'findIndexFrom', 'findLastFrom', 'findLastIndexFrom'], methodName => {
    const func = fp[methodName];

    QUnit.test(`fp.${methodName}\` should provide the correct \`predicate\` arguments`, assert => {
      assert.expect(1);

      let args;

      func(function () {
        args || (args = slice.call(arguments));
      })(1)([1, 2, 3]);

      assert.deepEqual(args, [2]);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.findFrom');

  (function () {
    /**
     *
     * @param value
     */
    function resolve(value) {
      return fp.flow(fp.property('a'), fp.eq(value));
    }

    QUnit.test('should have an argument order of `value`, `fromIndex`, then `array`', assert => {
      assert.expect(2);

      const objects = [{ a: 1 }, { a: 2 }, { a: 1 }, { a: 2 }];

      assert.strictEqual(fp.findFrom(resolve(1))(1)(objects), objects[2]);
      assert.strictEqual(fp.findFrom(resolve(2))(-2)(objects), objects[3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.findLastFrom');

  (function () {
    /**
     *
     * @param value
     */
    function resolve(value) {
      return fp.flow(fp.property('a'), fp.eq(value));
    }

    QUnit.test('should have an argument order of `value`, `fromIndex`, then `array`', assert => {
      assert.expect(2);

      const objects = [{ a: 1 }, { a: 2 }, { a: 1 }, { a: 2 }];

      assert.strictEqual(fp.findLastFrom(resolve(1))(1)(objects), objects[0]);
      assert.strictEqual(fp.findLastFrom(resolve(2))(-2)(objects), objects[1]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.findIndexFrom and fp.indexOfFrom');

  _.each(['findIndexFrom', 'indexOfFrom'], methodName => {
    const func = fp[methodName];
    const resolve = methodName == 'findIndexFrom' ? fp.eq : _.identity;

    QUnit.test(`fp.${methodName}\` should have an argument order of \`value\`, \`fromIndex\`, then \`array\``, assert => {
      assert.expect(2);

      const array = [1, 2, 3, 1, 2, 3];

      assert.strictEqual(func(resolve(1))(2)(array), 3);
      assert.strictEqual(func(resolve(2))(-3)(array), 4);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.findLastIndexFrom and fp.lastIndexOfFrom');

  _.each(['findLastIndexFrom', 'lastIndexOfFrom'], methodName => {
    const func = fp[methodName];
    const resolve = methodName == 'findLastIndexFrom' ? fp.eq : _.identity;

    QUnit.test(`fp.${methodName}\` should have an argument order of \`value\`, \`fromIndex\`, then \`array\``, assert => {
      assert.expect(2);

      const array = [1, 2, 3, 1, 2, 3];

      assert.strictEqual(func(resolve(2))(3)(array), 1);
      assert.strictEqual(func(resolve(3))(-3)(array), 2);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.flatMapDepth');

  (function () {
    QUnit.test('should have an argument order of `iteratee`, `depth`, then `collection`', assert => {
      assert.expect(2);

      /**
       *
       * @param n
       */
      function duplicate(n) {
        return [[[n, n]]];
      }

      const array = [1, 2];
      const object = { a: 1, b: 2 };
      const expected = [[1, 1], [2, 2]];

      assert.deepEqual(fp.flatMapDepth(duplicate)(2)(array), expected);
      assert.deepEqual(fp.flatMapDepth(duplicate)(2)(object), expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('flow methods');

  _.each(['flow', 'flowRight'], methodName => {
    const func = fp[methodName];
    const isFlow = methodName == 'flow';

    QUnit.test(`\`fp.${methodName}\` should support shortcut fusion`, assert => {
      assert.expect(6);

      let filterCount;
      let mapCount;
      const array = fp.range(0, LARGE_ARRAY_SIZE);

      const iteratee = function (value) {
        mapCount++;
        return square(value);
      };

      const predicate = function (value) {
        filterCount++;
        return isEven(value);
      };

      const filter = fp.filter(predicate);
      const map = fp.map(iteratee);
      const take = fp.take(2);

      _.times(2, index => {
        const combined = isFlow
          ? func(map, filter, fp.compact, take)
          : func(take, fp.compact, filter, map);

        filterCount = mapCount = 0;

        if (WeakMap && WeakMap.name) {
          assert.deepEqual(combined(array), [4, 16]);
          assert.strictEqual(filterCount, 5, 'filterCount');
          assert.strictEqual(mapCount, 5, 'mapCount');
        } else {
          skipAssert(assert, 3);
        }
      });
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('forEach methods');

  _.each(['forEach', 'forEachRight', 'forIn', 'forInRight', 'forOwn', 'forOwnRight'], methodName => {
    const func = fp[methodName];

    QUnit.test(`\`fp.${methodName}\` should provide \`value\` to \`iteratee\``, assert => {
      assert.expect(2);

      let args;

      func(function () {
        args || (args = slice.call(arguments));
      })(['a']);

      assert.deepEqual(args, ['a']);

      args = undefined;

      func(function () {
        args || (args = slice.call(arguments));
      })({ a: 1 });

      assert.deepEqual(args, [1]);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.getOr');

  (function () {
    QUnit.test('should accept a `defaultValue` param', assert => {
      assert.expect(1);

      const actual = fp.getOr('default')('path')({});
      assert.strictEqual(actual, 'default');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.gt and fp.gte');

  _.each(['gt', 'gte'], methodName => {
    const func = fp[methodName];

    QUnit.test(`\`fp.${methodName}\` should have \`rearg\` applied`, assert => {
      assert.expect(1);

      assert.strictEqual(func(2)(1), true);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.inRange');

  (function () {
    QUnit.test('should have an argument order of `start`, `end`, then `value`', assert => {
      assert.expect(2);

      assert.strictEqual(fp.inRange(2)(4)(3), true);
      assert.strictEqual(fp.inRange(-2)(-6)(-3), true);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.intersectionBy');

  (function () {
    QUnit.test('should have an argument order of `iteratee`, `array`, then `values`', assert => {
      assert.expect(1);

      const actual = fp.intersectionBy(Math.floor, [2.1, 1.2], [2.3, 3.4]);
      assert.deepEqual(actual, [2.1]);
    });

    QUnit.test('should provide the correct `iteratee` arguments', assert => {
      assert.expect(1);

      let args;

      fp.intersectionBy(function () {
        args || (args = slice.call(arguments));
      })([2.1, 1.2], [2.3, 3.4]);

      assert.deepEqual(args, [2.3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.intersectionWith');

  (function () {
    QUnit.test('should have an argument order of `comparator`, `array`, then `values`', assert => {
      assert.expect(1);

      const actual = fp.intersectionWith(fp.eq)([2, 1])([2, 3]);
      assert.deepEqual(actual, [2]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.invoke');

  (function () {
    QUnit.test('should not accept an `args` param', assert => {
      assert.expect(1);

      const actual = fp.invoke('toUpperCase')('a');
      assert.strictEqual(actual, 'A');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.invokeMap');

  (function () {
    QUnit.test('should not accept an `args` param', assert => {
      assert.expect(1);

      const actual = fp.invokeMap('toUpperCase')(['a', 'b']);
      assert.deepEqual(actual, ['A', 'B']);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.invokeArgs');

  (function () {
    QUnit.test('should accept an `args` param', assert => {
      assert.expect(1);

      const actual = fp.invokeArgs('concat')(['b', 'c'])('a');
      assert.strictEqual(actual, 'abc');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.invokeArgsMap');

  (function () {
    QUnit.test('should accept an `args` param', assert => {
      assert.expect(1);

      const actual = fp.invokeArgsMap('concat')(['b', 'c'])(['a', 'A']);
      assert.deepEqual(actual, ['abc', 'Abc']);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.isEqualWith');

  (function () {
    QUnit.test('should provide the correct `customizer` arguments', assert => {
      assert.expect(1);

      let args;
      let iteration = 0;
      const objects = [{ a: 1 }, { a: 2 }];
      const stack = { __data__: { __data__: [objects, objects.slice().reverse()], size: 2 }, size: 2 };
      const expected = [1, 2, 'a', objects[0], objects[1], stack];

      fp.isEqualWith(function () {
        if (++iteration == 2) {
          args = _.map(arguments, _.cloneDeep);
        }
      })(objects[0])(objects[1]);

      args[5] = _.omitBy(args[5], _.isFunction);
      args[5].__data__ = _.omitBy(args[5].__data__, _.isFunction);

      assert.deepEqual(args, expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.isMatchWith');

  (function () {
    QUnit.test('should provide the correct `customizer` arguments', assert => {
      assert.expect(1);

      let args;
      const objects = [{ a: 1 }, { a: 2 }];
      const stack = { __data__: { __data__: [], size: 0 }, size: 0 };
      const expected = [2, 1, 'a', objects[1], objects[0], stack];

      fp.isMatchWith(function () {
        args || (args = _.map(arguments, _.cloneDeep));
      })(objects[0])(objects[1]);

      args[5] = _.omitBy(args[5], _.isFunction);
      args[5].__data__ = _.omitBy(args[5].__data__, _.isFunction);

      assert.deepEqual(args, expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.iteratee');

  (function () {
    QUnit.test('should return a iteratee with capped params', assert => {
      assert.expect(1);

      const func = fp.iteratee((a, b, c) => [a, b, c], 3);
      assert.deepEqual(func(1, 2, 3), [1, undefined, undefined]);
    });

    QUnit.test('should convert by name', assert => {
      assert.expect(1);

      const iteratee = convert('iteratee', _.iteratee);
      const func = iteratee((a, b, c) => [a, b, c], 3);

      assert.deepEqual(func(1, 2, 3), [1, undefined, undefined]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.lt and fp.lte');

  _.each(['lt', 'lte'], methodName => {
    const func = fp[methodName];

    QUnit.test(`\`fp.${methodName}\` should have \`rearg\` applied`, assert => {
      assert.expect(1);

      assert.strictEqual(func(1)(2), true);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.mapKeys');

  (function () {
    QUnit.test('should only provide `key` to `iteratee`', assert => {
      assert.expect(1);

      let args;

      fp.mapKeys(function () {
        args || (args = slice.call(arguments));
      }, { a: 1 });

      assert.deepEqual(args, ['a']);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.maxBy and fp.minBy');

  _.each(['maxBy', 'minBy'], methodName => {
    const array = [1, 2, 3];
    const func = fp[methodName];
    const isMax = methodName == 'maxBy';

    QUnit.test(`\`fp.${methodName}\` should work with an \`iteratee\` argument`, assert => {
      assert.expect(1);

      const actual = func(num => -num)(array);

      assert.strictEqual(actual, isMax ? 1 : 3);
    });

    QUnit.test(`\`fp.${methodName}\` should provide the correct \`iteratee\` arguments`, assert => {
      assert.expect(1);

      let args;

      func(function () {
        args || (args = slice.call(arguments));
      })(array);

      assert.deepEqual(args, [1]);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.mergeWith');

  (function () {
    QUnit.test('should provide the correct `customizer` arguments', assert => {
      assert.expect(1);

      let args;
      const stack = { __data__: { __data__: [], size: 0 }, size: 0 };
      const expected = [[1, 2], [3], 'a', { a: [1, 2] }, { a: [3] }, stack];

      fp.mergeWith(function () {
        args || (args = _.map(arguments, _.cloneDeep));
      })({ a: [1, 2] })({ a: [3] });

      args[5] = _.omitBy(args[5], _.isFunction);
      args[5].__data__ = _.omitBy(args[5].__data__, _.isFunction);

      assert.deepEqual(args, expected);
    });

    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const objects = [{ a: [1, 2] }, { a: [3] }];
      const actual = fp.mergeWith(_.noop, objects[0], objects[1]);

      assert.deepEqual(objects[0], { a: [1, 2] });
      assert.deepEqual(actual, { a: [3, 2] });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.mergeAllWith');

  (function () {
    QUnit.test('should provide the correct `customizer` arguments', assert => {
      assert.expect(1);

      let args;
      const objects = [{ a: [1, 2] }, { a: [3] }];
      const stack = { __data__: { __data__: [], size: 0 }, size: 0 };
      const expected = [[1, 2], [3], 'a', { a: [1, 2] }, { a: [3] }, stack];

      fp.mergeAllWith(function () {
        args || (args = _.map(arguments, _.cloneDeep));
      })(objects);

      args[5] = _.omitBy(args[5], _.isFunction);
      args[5].__data__ = _.omitBy(args[5].__data__, _.isFunction);

      assert.deepEqual(args, expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.mixin');

  (function () {
    const source = { a: _.noop };

    QUnit.test('should mixin static methods but not prototype methods', assert => {
      assert.expect(2);

      fp.mixin(source);

      assert.strictEqual(typeof fp.a, 'function');
      assert.notOk('a' in fp.prototype);

      delete fp.a;
      delete fp.prototype.a;
    });

    QUnit.test('should not assign inherited `source` methods', assert => {
      assert.expect(2);

      /**
       *
       */
      function Foo() {}
      Foo.prototype.a = _.noop;
      fp.mixin(new Foo());

      assert.notOk('a' in fp);
      assert.notOk('a' in fp.prototype);

      delete fp.a;
      delete fp.prototype.a;
    });

    QUnit.test('should not remove existing prototype methods', assert => {
      assert.expect(2);

      const each1 = fp.each;
      const each2 = fp.prototype.each;

      fp.mixin({ each: source.a });

      assert.strictEqual(fp.each, source.a);
      assert.strictEqual(fp.prototype.each, each2);

      fp.each = each1;
      fp.prototype.each = each2;
    });

    QUnit.test('should not export to the global when `source` is not an object', assert => {
      assert.expect(2);

      const props = _.without(_.keys(_), '_');

      _.times(2, index => {
        fp.mixin.apply(fp, index ? [1] : []);

        assert.ok(_.every(props, key => root[key] !== fp[key]));

        _.each(props, key => {
          if (root[key] === fp[key]) {
            delete root[key];
          }
        });
      });
    });

    QUnit.test('should convert by name', assert => {
      assert.expect(3);

      const object = { mixin: convert('mixin', _.mixin) };

      /**
       *
       */
      function Foo() {}
      Foo.mixin = object.mixin;
      Foo.mixin(source);

      assert.ok('a' in Foo);
      assert.notOk('a' in Foo.prototype);

      object.mixin(source);
      assert.ok('a' in object);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.nthArg');

  (function () {
    QUnit.test('should return a curried function', assert => {
      assert.expect(2);

      let func = fp.nthArg(1);
      assert.strictEqual(func(1)(2), 2);

      func = fp.nthArg(-1);
      assert.strictEqual(func(1), 1);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.over');

  (function () {
    QUnit.test('should not cap iteratee args', assert => {
      assert.expect(2);

      _.each([fp.over, convert('over', _.over)], func => {
        const over = func([Math.max, Math.min]);
        assert.deepEqual(over(1, 2, 3, 4), [4, 1]);
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.omitBy and fp.pickBy');

  _.each(['omitBy', 'pickBy'], methodName => {
    const func = fp[methodName];

    QUnit.test(`\`fp.${methodName}\` should provide \`value\` and \`key\` to \`iteratee\``, assert => {
      assert.expect(1);

      let args;

      func(function () {
        args || (args = slice.call(arguments));
      })({ a: 1 });

      assert.deepEqual(args, [1, 'a']);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('padChars methods');

  _.each(['padChars', 'padCharsStart', 'padCharsEnd'], methodName => {
    const func = fp[methodName];
    const isPad = methodName == 'padChars';
    const isStart = methodName == 'padCharsStart';

    QUnit.test(`fp.${methodName}\` should truncate pad characters to fit the pad length`, assert => {
      assert.expect(1);

      if (isPad) {
        assert.strictEqual(func('_-')(8)('abc'), '_-abc_-_');
      } else {
        assert.strictEqual(func('_-')(6)('abc'), isStart ? '_-_abc' : 'abc_-_');
      }
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('partial methods');

  _.each(['partial', 'partialRight'], methodName => {
    const func = fp[methodName];
    const isPartial = methodName == 'partial';

    QUnit.test(`fp.${methodName}\` should accept an \`args\` param`, assert => {
      assert.expect(1);

      const expected = isPartial ? [1, 2, 3] : [0, 1, 2];

      const actual = func((a, b, c) => [a, b, c])([1, 2])(isPartial ? 3 : 0);

      assert.deepEqual(actual, expected);
    });

    QUnit.test(`fp.${methodName}\` should convert by name`, assert => {
      assert.expect(2);

      const expected = isPartial ? [1, 2, 3] : [0, 1, 2];
      const par = convert(methodName, _[methodName]);
      const ph = par.placeholder;

      let actual = par((a, b, c) => [a, b, c])([1, 2])(isPartial ? 3 : 0);

      assert.deepEqual(actual, expected);

      actual = par((a, b, c) => [a, b, c])([ph, 2])(isPartial ? 1 : 0, isPartial ? 3 : 1);

      assert.deepEqual(actual, expected);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.propertyOf');

  (function () {
    QUnit.test('should be curried', assert => {
      assert.expect(2);

      const object = { a: 1 };

      assert.strictEqual(fp.propertyOf(object, 'a'), 1);
      assert.strictEqual(fp.propertyOf(object)('a'), 1);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.pull');

  (function () {
    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const array = [1, 2, 3];
      const actual = fp.pull(2)(array);

      assert.deepEqual(array, [1, 2, 3]);
      assert.deepEqual(actual, [1, 3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.pullAll');

  (function () {
    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const array = [1, 2, 3];
      const actual = fp.pullAll([1, 3])(array);

      assert.deepEqual(array, [1, 2, 3]);
      assert.deepEqual(actual, [2]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.pullAt');

  (function () {
    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const array = [1, 2, 3];
      const actual = fp.pullAt([0, 2])(array);

      assert.deepEqual(array, [1, 2, 3]);
      assert.deepEqual(actual, [2]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.random');

  (function () {
    const array = Array(1000);

    QUnit.test('should support a `min` and `max` argument', assert => {
      assert.expect(1);

      const min = 5;
      const max = 10;

      assert.ok(_.some(array, () => {
        const result = fp.random(min)(max);
        return result >= min && result <= max;
      }));
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('range methods');

  _.each(['range', 'rangeRight'], methodName => {
    const func = fp[methodName];
    const isRange = methodName == 'range';

    QUnit.test(`fp.${methodName}\` should have an argument order of \`start\` then \`end\``, assert => {
      assert.expect(1);

      assert.deepEqual(func(1)(4), isRange ? [1, 2, 3] : [3, 2, 1]);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('rangeStep methods');

  _.each(['rangeStep', 'rangeStepRight'], methodName => {
    const func = fp[methodName];
    const isRange = methodName == 'rangeStep';

    QUnit.test(`fp.${methodName}\` should have an argument order of \`step\`, \`start\`, then \`end\``, assert => {
      assert.expect(1);

      assert.deepEqual(func(2)(1)(4), isRange ? [1, 3] : [3, 1]);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.rearg');

  (function () {
    /**
     *
     * @param a
     * @param b
     * @param c
     */
    function fn(a, b, c) {
      return [a, b, c];
    }

    QUnit.test('should be curried', assert => {
      assert.expect(1);

      const rearged = fp.rearg([1, 2, 0])(fn);
      assert.deepEqual(rearged('c', 'a', 'b'), ['a', 'b', 'c']);
    });

    QUnit.test('should return a curried function', assert => {
      assert.expect(1);

      const rearged = fp.rearg([1, 2, 0], fn);
      assert.deepEqual(rearged('c')('a')('b'), ['a', 'b', 'c']);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('reduce methods');

  _.each(['reduce', 'reduceRight'], methodName => {
    const func = fp[methodName];
    const isReduce = methodName == 'reduce';

    QUnit.test(`\`fp.${methodName}\` should provide the correct \`iteratee\` arguments when iterating an array`, assert => {
      assert.expect(1);

      let args;

      func(function () {
        args || (args = slice.call(arguments));
      })(0)([1, 2, 3]);

      assert.deepEqual(args, isReduce ? [0, 1] : [3, 0]);
    });

    QUnit.test(`\`fp.${methodName}\` should provide the correct \`iteratee\` arguments when iterating an object`, assert => {
      assert.expect(1);

      let args;
      const object = { a: 1, b: 2 };
      const isFIFO = _.keys(object)[0] == 'a';

      const expected = isFIFO
        ? (isReduce ? [0, 1] : [2, 0])
        : (isReduce ? [0, 2] : [1, 0]);

      func(function () {
        args || (args = slice.call(arguments));
      })(0)(object);

      assert.deepEqual(args, expected);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.remove');

  (function () {
    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const array = [1, 2, 3];
      const actual = fp.remove(fp.eq(2))(array);

      assert.deepEqual(array, [1, 2, 3]);
      assert.deepEqual(actual, [1, 3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.restFrom');

  (function () {
    QUnit.test('should accept a `start` param', assert => {
      assert.expect(1);

      const actual = fp.restFrom(2)(function () {
        return slice.call(arguments);
      })('a', 'b', 'c', 'd');

      assert.deepEqual(actual, ['a', 'b', ['c', 'd']]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.reverse');

  (function () {
    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const array = [1, 2, 3];
      const actual = fp.reverse(array);

      assert.deepEqual(array, [1, 2, 3]);
      assert.deepEqual(actual, [3, 2, 1]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.runInContext');

  (function () {
    QUnit.test('should return a converted lodash instance', assert => {
      assert.expect(1);

      assert.strictEqual(typeof fp.runInContext({}).curryN, 'function');
    });

    QUnit.test('should convert by name', assert => {
      assert.expect(1);

      const runInContext = convert('runInContext', _.runInContext);
      assert.strictEqual(typeof runInContext({}).curryN, 'function');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.set');

  (function () {
    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const object = { a: { b: 2, c: 3 } };
      const actual = fp.set('a.b')(3)(object);

      assert.deepEqual(object, { a: { b: 2, c: 3 } });
      assert.deepEqual(actual, { a: { b: 3, c: 3 } });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.setWith');

  (function () {
    QUnit.test('should provide the correct `customizer` arguments', assert => {
      assert.expect(1);

      let args;

      fp.setWith(function () {
        args || (args = _.map(arguments, _.cloneDeep));
      })('b.c')(2)({ a: 1 });

      assert.deepEqual(args, [undefined, 'b', { a: 1 }]);
    });

    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const object = { a: { b: 2, c: 3 } };
      const actual = fp.setWith(Object)('d.e')(4)(object);

      assert.deepEqual(object, { a: { b: 2, c: 3 } });
      assert.deepEqual(actual, { a: { b: 2, c: 3 }, d: { e: 4 } });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.spreadFrom');

  (function () {
    QUnit.test('should accept a `start` param', assert => {
      assert.expect(1);

      const actual = fp.spreadFrom(2)(function () {
        return slice.call(arguments);
      })('a', 'b', ['c', 'd']);

      assert.deepEqual(actual, ['a', 'b', 'c', 'd']);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('trimChars methods');

  _.each(['trimChars', 'trimCharsStart', 'trimCharsEnd'], (methodName, index) => {
    const func = fp[methodName];
    let parts = [];

    if (index != 2) {
      parts.push('leading');
    }
    if (index != 1) {
      parts.push('trailing');
    }
    parts = parts.join(' and ');

    QUnit.test(`\`fp.${methodName}\` should remove ${parts} \`chars\``, assert => {
      assert.expect(1);

      const string = '-_-a-b-c-_-';
      const expected = `${index == 2 ? '-_-' : ''}a-b-c${index == 1 ? '-_-' : ''}`;

      assert.strictEqual(func('_-')(string), expected);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.unionBy');

  (function () {
    QUnit.test('should have an argument order of `iteratee`, `array`, then `other`', assert => {
      assert.expect(1);

      const actual = fp.unionBy(Math.floor, [2.1], [1.2, 2.3]);
      assert.deepEqual(actual, [2.1, 1.2]);
    });

    QUnit.test('should provide the correct `iteratee` arguments', assert => {
      assert.expect(1);

      let args;

      fp.unionBy(function () {
        args || (args = slice.call(arguments));
      })([2.1], [1.2, 2.3]);

      assert.deepEqual(args, [2.1]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.unionWith');

  (function () {
    QUnit.test('should have an argument order of `comparator`, `array`, then `values`', assert => {
      assert.expect(1);

      const actual = fp.unionWith(fp.eq)([2, 1])([2, 3]);
      assert.deepEqual(actual, [2, 1, 3]);
    });

    QUnit.test('should provide the correct `comparator` arguments', assert => {
      assert.expect(1);

      let args;

      fp.unionWith(function () {
        args || (args = slice.call(arguments));
      })([2, 1])([2, 3]);

      assert.deepEqual(args, [1, 2]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.uniqBy');

  (function () {
    const objects = [{ a: 2 }, { a: 3 }, { a: 1 }, { a: 2 }, { a: 3 }, { a: 1 }];

    QUnit.test('should work with an `iteratee` argument', assert => {
      assert.expect(1);

      const expected = objects.slice(0, 3);
      const actual = fp.uniqBy(_.property('a'))(objects);

      assert.deepEqual(actual, expected);
    });

    QUnit.test('should provide the correct `iteratee` arguments', assert => {
      assert.expect(1);

      let args;

      fp.uniqBy(function () {
        args || (args = slice.call(arguments));
      })(objects);

      assert.deepEqual(args, [objects[0]]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.uniqWith');

  (function () {
    QUnit.test('should have an argument order of `comparator`, `array`, then `values`', assert => {
      assert.expect(1);

      const actual = fp.uniqWith(fp.eq)([2, 1, 2]);
      assert.deepEqual(actual, [2, 1]);
    });

    QUnit.test('should provide the correct `comparator` arguments', assert => {
      assert.expect(1);

      let args;

      fp.uniqWith(function () {
        args || (args = slice.call(arguments));
      })([2, 1, 2]);

      assert.deepEqual(args, [1, 2]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.update');

  (function () {
    QUnit.test('should not convert end of `path` to an object', assert => {
      assert.expect(1);

      const actual = fp.update('a.b')(_.identity)({ a: { b: 1 } });
      assert.strictEqual(typeof actual.a.b, 'number');
    });

    QUnit.test('should not convert uncloneables to objects', assert => {
      assert.expect(2);

      const object = { a: { b: _.constant(true) } };
      const actual = fp.update('a.b')(_.identity)(object);

      assert.strictEqual(typeof object.a.b, 'function');
      assert.strictEqual(object.a.b, actual.a.b);
    });

    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const object = { a: { b: 2, c: 3 } };
      const actual = fp.update('a.b')(square)(object);

      assert.deepEqual(object, { a: { b: 2, c: 3 } });
      assert.deepEqual(actual, { a: { b: 4, c: 3 } });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.updateWith');

  (function () {
    QUnit.test('should provide the correct `customizer` arguments', assert => {
      let args;

      fp.updateWith(function () {
        args || (args = _.map(arguments, _.cloneDeep));
      })('b.c')(_.constant(2))({ a: 1 });

      assert.deepEqual(args, [undefined, 'b', { a: 1 }]);
    });

    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const object = { a: { b: 2, c: 3 } };
      const actual = fp.updateWith(Object)('d.e')(_.constant(4))(object);

      assert.deepEqual(object, { a: { b: 2, c: 3 } });
      assert.deepEqual(actual, { a: { b: 2, c: 3 }, d: { e: 4 } });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.unset');

  (function () {
    QUnit.test('should not mutate values', assert => {
      assert.expect(2);

      const object = { a: { b: 2, c: 3 } };
      const actual = fp.unset('a.b')(object);

      assert.deepEqual(object, { a: { b: 2, c: 3 } });
      assert.deepEqual(actual, { a: { c: 3 } });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.xorBy');

  (function () {
    QUnit.test('should have an argument order of `iteratee`, `array`, then `other`', assert => {
      assert.expect(1);

      const actual = fp.xorBy(Math.floor, [2.1, 1.2], [2.3, 3.4]);
      assert.deepEqual(actual, [1.2, 3.4]);
    });

    QUnit.test('should provide the correct `iteratee` arguments', assert => {
      assert.expect(1);

      let args;

      fp.xorBy(function () {
        args || (args = slice.call(arguments));
      })([2.1, 1.2], [2.3, 3.4]);

      assert.deepEqual(args, [2.3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.xorWith');

  (function () {
    QUnit.test('should have an argument order of `comparator`, `array`, then `values`', assert => {
      assert.expect(1);

      const actual = fp.xorWith(fp.eq)([2, 1])([2, 3]);
      assert.deepEqual(actual, [1, 3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('with methods');

  _.each(['differenceWith', 'intersectionWith', 'xorWith'], methodName => {
    const func = fp[methodName];

    QUnit.test(`\`fp.${methodName}\` should provide the correct \`comparator\` arguments`, assert => {
      assert.expect(1);

      let args;

      func(function () {
        args || (args = slice.call(arguments));
      })([2, 1])([2, 3]);

      assert.deepEqual(args, [2, 2]);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.zip');

  (function () {
    QUnit.test('should zip together two arrays', assert => {
      assert.expect(1);

      assert.deepEqual(fp.zip([1, 2])([3, 4]), [[1, 3], [2, 4]]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.zipAll');

  (function () {
    QUnit.test('should zip together an array of arrays', assert => {
      assert.expect(1);

      assert.deepEqual(fp.zipAll([[1, 2], [3, 4], [5, 6]]), [[1, 3, 5], [2, 4, 6]]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.zipObject');

  (function () {
    QUnit.test('should zip together key/value arrays into an object', assert => {
      assert.expect(1);

      assert.deepEqual(fp.zipObject(['a', 'b'])([1, 2]), { a: 1, b: 2 });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('fp.zipWith');

  (function () {
    QUnit.test('should zip arrays combining grouped elements with `iteratee`', assert => {
      assert.expect(1);

      const array1 = [1, 2, 3];
      const array2 = [4, 5, 6];
      const actual = fp.zipWith(add)(array1)(array2);

      assert.deepEqual(actual, [5, 7, 9]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.config.asyncRetries = 10;
  QUnit.config.hidepassed = true;

  if (!document) {
    QUnit.config.noglobals = true;
    QUnit.load();
    QUnit.start();
  }
}.call(this));

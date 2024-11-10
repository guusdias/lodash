const mapping = require('./_mapping');
const fallbackHolder = require('./placeholder');

/** Built-in value reference. */
const { push } = Array.prototype;

/**
 * Creates a function, with an arity of `n`, that invokes `func` with the
 * arguments it receives.
 * @private
 * @param {Function} func The function to wrap.
 * @param {number} n The arity of the new function.
 * @returns {Function} Returns the new function.
 */
function baseArity(func, n) {
  return n == 2
    ? function (a, b) { return func.apply(undefined, arguments); }
    : function (a) { return func.apply(undefined, arguments); };
}

/**
 * Creates a function that invokes `func`, with up to `n` arguments, ignoring
 * any additional arguments.
 * @private
 * @param {Function} func The function to cap arguments for.
 * @param {number} n The arity cap.
 * @returns {Function} Returns the new function.
 */
function baseAry(func, n) {
  return n == 2
    ? function (a, b) { return func(a, b); }
    : function (a) { return func(a); };
}

/**
 * Creates a clone of `array`.
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the cloned array.
 */
function cloneArray(array) {
  let length = array ? array.length : 0;
  const result = Array(length);

  while (length--) {
    result[length] = array[length];
  }
  return result;
}

/**
 * Creates a function that clones a given object using the assignment `func`.
 * @private
 * @param {Function} func The assignment function.
 * @returns {Function} Returns the new cloner function.
 */
function createCloner(func) {
  return function (object) {
    return func({}, object);
  };
}

/**
 * A specialized version of `_.spread` which flattens the spread array into
 * the arguments of the invoked `func`.
 * @private
 * @param {Function} func The function to spread arguments over.
 * @param {number} start The start position of the spread.
 * @returns {Function} Returns the new function.
 */
function flatSpread(func, start) {
  return function () {
    let { length } = arguments;
    const lastIndex = length - 1;
    const args = Array(length);

    while (length--) {
      args[length] = arguments[length];
    }
    const array = args[start];
    const otherArgs = args.slice(0, start);

    if (array) {
      push.apply(otherArgs, array);
    }
    if (start != lastIndex) {
      push.apply(otherArgs, args.slice(start + 1));
    }
    return func.apply(this, otherArgs);
  };
}

/**
 * Creates a function that wraps `func` and uses `cloner` to clone the first
 * argument it receives.
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} cloner The function to clone arguments.
 * @returns {Function} Returns the new immutable function.
 */
function wrapImmutable(func, cloner) {
  return function () {
    let { length } = arguments;
    if (!length) {
      return;
    }
    const args = Array(length);
    while (length--) {
      args[length] = arguments[length];
    }
    const result = args[0] = cloner.apply(undefined, args);
    func.apply(undefined, args);
    return result;
  };
}

/**
 * The base implementation of `convert` which accepts a `util` object of methods
 * required to perform conversions.
 * @param {object} util The util object.
 * @param {string} name The name of the function to convert.
 * @param {Function} func The function to convert.
 * @param {object} [options] The options object.
 * @param {boolean} [options.cap] Specify capping iteratee arguments.
 * @param {boolean} [options.curry] Specify currying.
 * @param {boolean} [options.fixed] Specify fixed arity.
 * @param {boolean} [options.immutable] Specify immutable operations.
 * @param {boolean} [options.rearg] Specify rearranging arguments.
 * @returns {Function | object} Returns the converted function or object.
 */
function baseConvert(util, name, func, options) {
  const isLib = typeof name === 'function';
  const isObj = name === Object(name);

  if (isObj) {
    options = func;
    func = name;
    name = undefined;
  }
  if (func == null) {
    throw new TypeError();
  }
  options || (options = {});

  const config = {
    cap: 'cap' in options ? options.cap : true,
    curry: 'curry' in options ? options.curry : true,
    fixed: 'fixed' in options ? options.fixed : true,
    immutable: 'immutable' in options ? options.immutable : true,
    rearg: 'rearg' in options ? options.rearg : true,
  };

  const defaultHolder = isLib ? func : fallbackHolder;
  const forceCurry = ('curry' in options) && options.curry;
  const forceFixed = ('fixed' in options) && options.fixed;
  const forceRearg = ('rearg' in options) && options.rearg;
  const pristine = isLib ? func.runInContext() : undefined;

  const helpers = isLib ? func : {
    ary: util.ary,
    assign: util.assign,
    clone: util.clone,
    curry: util.curry,
    forEach: util.forEach,
    isArray: util.isArray,
    isError: util.isError,
    isFunction: util.isFunction,
    isWeakMap: util.isWeakMap,
    iteratee: util.iteratee,
    keys: util.keys,
    rearg: util.rearg,
    toInteger: util.toInteger,
    toPath: util.toPath,
  };

  const { ary } = helpers;
  const { assign } = helpers;
  const { clone } = helpers;
  const { curry } = helpers;
  const each = helpers.forEach;
  const { isArray } = helpers;
  const { isError } = helpers;
  const { isFunction } = helpers;
  const { isWeakMap } = helpers;
  const { keys } = helpers;
  const { rearg } = helpers;
  const { toInteger } = helpers;
  const { toPath } = helpers;

  const aryMethodKeys = keys(mapping.aryMethod);

  const wrappers = {
    castArray(castArray) {
      return function () {
        const value = arguments[0];
        return isArray(value)
          ? castArray(cloneArray(value))
          : castArray.apply(undefined, arguments);
      };
    },
    iteratee(iteratee) {
      return function () {
        const func = arguments[0];
        let arity = arguments[1];
        const result = iteratee(func, arity);
        const { length } = result;

        if (config.cap && typeof arity === 'number') {
          arity = arity > 2 ? (arity - 2) : 1;
          return (length && length <= arity) ? result : baseAry(result, arity);
        }
        return result;
      };
    },
    mixin(mixin) {
      return function (source) {
        const func = this;
        if (!isFunction(func)) {
          return mixin(func, Object(source));
        }
        const pairs = [];
        each(keys(source), key => {
          if (isFunction(source[key])) {
            pairs.push([key, func.prototype[key]]);
          }
        });

        mixin(func, Object(source));

        each(pairs, pair => {
          const value = pair[1];
          if (isFunction(value)) {
            func.prototype[pair[0]] = value;
          } else {
            delete func.prototype[pair[0]];
          }
        });
        return func;
      };
    },
    nthArg(nthArg) {
      return function (n) {
        const arity = n < 0 ? 1 : (toInteger(n) + 1);
        return curry(nthArg(n), arity);
      };
    },
    rearg(rearg) {
      return function (func, indexes) {
        const arity = indexes ? indexes.length : 0;
        return curry(rearg(func, indexes), arity);
      };
    },
    runInContext(runInContext) {
      return function (context) {
        return baseConvert(util, runInContext(context), options);
      };
    },
  };

  /*--------------------------------------------------------------------------*/

  /**
   * Casts `func` to a function with an arity capped iteratee if needed.
   * @private
   * @param {string} name The name of the function to inspect.
   * @param {Function} func The function to inspect.
   * @returns {Function} Returns the cast function.
   */
  function castCap(name, func) {
    if (config.cap) {
      const indexes = mapping.iterateeRearg[name];
      if (indexes) {
        return iterateeRearg(func, indexes);
      }
      const n = !isLib && mapping.iterateeAry[name];
      if (n) {
        return iterateeAry(func, n);
      }
    }
    return func;
  }

  /**
   * Casts `func` to a curried function if needed.
   * @private
   * @param {string} name The name of the function to inspect.
   * @param {Function} func The function to inspect.
   * @param {number} n The arity of `func`.
   * @returns {Function} Returns the cast function.
   */
  function castCurry(name, func, n) {
    return (forceCurry || (config.curry && n > 1))
      ? curry(func, n)
      : func;
  }

  /**
   * Casts `func` to a fixed arity function if needed.
   * @private
   * @param {string} name The name of the function to inspect.
   * @param {Function} func The function to inspect.
   * @param {number} n The arity cap.
   * @returns {Function} Returns the cast function.
   */
  function castFixed(name, func, n) {
    if (config.fixed && (forceFixed || !mapping.skipFixed[name])) {
      const data = mapping.methodSpread[name];
      const start = data && data.start;

      return start === undefined ? ary(func, n) : flatSpread(func, start);
    }
    return func;
  }

  /**
   * Casts `func` to an rearged function if needed.
   * @private
   * @param {string} name The name of the function to inspect.
   * @param {Function} func The function to inspect.
   * @param {number} n The arity of `func`.
   * @returns {Function} Returns the cast function.
   */
  function castRearg(name, func, n) {
    return (config.rearg && n > 1 && (forceRearg || !mapping.skipRearg[name]))
      ? rearg(func, mapping.methodRearg[name] || mapping.aryRearg[n])
      : func;
  }

  /**
   * Creates a clone of `object` by `path`.
   * @private
   * @param {object} object The object to clone.
   * @param {Array|string} path The path to clone by.
   * @returns {object} Returns the cloned object.
   */
  function cloneByPath(object, path) {
    path = toPath(path);

    let index = -1;
    const { length } = path;
    const lastIndex = length - 1;
    const result = clone(Object(object));
    let nested = result;

    while (nested != null && ++index < length) {
      const key = path[index];
      const value = nested[key];

      if (value != null
          && !(isFunction(value) || isError(value) || isWeakMap(value))) {
        nested[key] = clone(index == lastIndex ? value : Object(value));
      }
      nested = nested[key];
    }
    return result;
  }

  /**
   * Converts `lodash` to an immutable auto-curried iteratee-first data-last
   * version with conversion `options` applied.
   * @param {object} [options] The options object. See `baseConvert` for more details.
   * @returns {Function} Returns the converted `lodash`.
   */
  function convertLib(options) {
    return _.runInContext.convert(options)(undefined);
  }

  /**
   * Create a converter function for `func` of `name`.
   * @param {string} name The name of the function to convert.
   * @param {Function} func The function to convert.
   * @returns {Function} Returns the new converter function.
   */
  function createConverter(name, func) {
    const realName = mapping.aliasToReal[name] || name;
    const methodName = mapping.remap[realName] || realName;
    const oldOptions = options;

    return function (options) {
      const newUtil = isLib ? pristine : helpers;
      const newFunc = isLib ? pristine[methodName] : func;
      const newOptions = assign(assign({}, oldOptions), options);

      return baseConvert(newUtil, realName, newFunc, newOptions);
    };
  }

  /**
   * Creates a function that wraps `func` to invoke its iteratee, with up to `n`
   * arguments, ignoring any additional arguments.
   * @private
   * @param {Function} func The function to cap iteratee arguments for.
   * @param {number} n The arity cap.
   * @returns {Function} Returns the new function.
   */
  function iterateeAry(func, n) {
    return overArg(func, func => (typeof func === 'function' ? baseAry(func, n) : func));
  }

  /**
   * Creates a function that wraps `func` to invoke its iteratee with arguments
   * arranged according to the specified `indexes` where the argument value at
   * the first index is provided as the first argument, the argument value at
   * the second index is provided as the second argument, and so on.
   * @private
   * @param {Function} func The function to rearrange iteratee arguments for.
   * @param {number[]} indexes The arranged argument indexes.
   * @returns {Function} Returns the new function.
   */
  function iterateeRearg(func, indexes) {
    return overArg(func, func => {
      const n = indexes.length;
      return baseArity(rearg(baseAry(func, n), indexes), n);
    });
  }

  /**
   * Creates a function that invokes `func` with its first argument transformed.
   * @private
   * @param {Function} func The function to wrap.
   * @param {Function} transform The argument transform.
   * @returns {Function} Returns the new function.
   */
  function overArg(func, transform) {
    return function () {
      let { length } = arguments;
      if (!length) {
        return func();
      }
      const args = Array(length);
      while (length--) {
        args[length] = arguments[length];
      }
      const index = config.rearg ? 0 : (length - 1);
      args[index] = transform(args[index]);
      return func.apply(undefined, args);
    };
  }

  /**
   * Creates a function that wraps `func` and applys the conversions
   * rules by `name`.
   * @private
   * @param {string} name The name of the function to wrap.
   * @param placeholder
   * @param {Function} func The function to wrap.
   * @returns {Function} Returns the converted function.
   */
  function wrap(name, func, placeholder) {
    let result;
    const realName = mapping.aliasToReal[name] || name;
    let wrapped = func;
    const wrapper = wrappers[realName];

    if (wrapper) {
      wrapped = wrapper(func);
    } else if (config.immutable) {
      if (mapping.mutate.array[realName]) {
        wrapped = wrapImmutable(func, cloneArray);
      } else if (mapping.mutate.object[realName]) {
        wrapped = wrapImmutable(func, createCloner(func));
      } else if (mapping.mutate.set[realName]) {
        wrapped = wrapImmutable(func, cloneByPath);
      }
    }
    each(aryMethodKeys, aryKey => {
      each(mapping.aryMethod[aryKey], otherName => {
        if (realName == otherName) {
          const data = mapping.methodSpread[realName];
          const afterRearg = data && data.afterRearg;

          result = afterRearg
            ? castFixed(realName, castRearg(realName, wrapped, aryKey), aryKey)
            : castRearg(realName, castFixed(realName, wrapped, aryKey), aryKey);

          result = castCap(realName, result);
          result = castCurry(realName, result, aryKey);
          return false;
        }
      });
      return !result;
    });

    result || (result = wrapped);
    if (result == func) {
      result = forceCurry ? curry(result, 1) : function () {
        return func.apply(this, arguments);
      };
    }
    result.convert = createConverter(realName, func);
    result.placeholder = func.placeholder = placeholder;

    return result;
  }

  /*--------------------------------------------------------------------------*/

  if (!isObj) {
    return wrap(name, func, defaultHolder);
  }
  var _ = func;

  // Convert methods by ary cap.
  const pairs = [];
  each(aryMethodKeys, aryKey => {
    each(mapping.aryMethod[aryKey], key => {
      const func = _[mapping.remap[key] || key];
      if (func) {
        pairs.push([key, wrap(key, func, _)]);
      }
    });
  });

  // Convert remaining methods.
  each(keys(_), key => {
    const func = _[key];
    if (typeof func === 'function') {
      let { length } = pairs;
      while (length--) {
        if (pairs[length][0] == key) {
          return;
        }
      }
      func.convert = createConverter(key, func);
      pairs.push([key, func]);
    }
  });

  // Assign to `_` leaving `_.prototype` unchanged to allow chaining.
  each(pairs, pair => {
    _[pair[0]] = pair[1];
  });

  _.convert = convertLib;
  _.placeholder = _;

  // Assign aliases.
  each(keys(_), key => {
    each(mapping.realToAlias[key] || [], alias => {
      _[alias] = _[key];
    });
  });

  return _;
}

module.exports = baseConvert;

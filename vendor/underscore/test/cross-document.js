(function () {
  if (typeof document === 'undefined') return;

  const _ = typeof require === 'function' ? require('..') : window._;

  QUnit.module('Cross Document');
  /* global iObject, iElement, iArguments, iFunction, iArray, iError, iString, iNumber, iBoolean, iDate, iRegExp, iNaN, iNull, iUndefined, ActiveXObject */

  // Setup remote variables for iFrame tests.
  const iframe = document.createElement('iframe');
  iframe.frameBorder = iframe.height = iframe.width = 0;
  document.body.appendChild(iframe);
  var iDoc = (iDoc = iframe.contentDocument || iframe.contentWindow).document || iDoc;
  iDoc.write(
    [
      '<script>',
      'parent.iElement = document.createElement("div");',
      'parent.iArguments = (function(){ return arguments; })(1, 2, 3);',
      'parent.iArray = [1, 2, 3];',
      'parent.iString = new String("hello");',
      'parent.iNumber = new Number(100);',
      'parent.iFunction = (function(){});',
      'parent.iDate = new Date();',
      'parent.iRegExp = /hi/;',
      'parent.iNaN = NaN;',
      'parent.iNull = null;',
      'parent.iBoolean = new Boolean(false);',
      'parent.iUndefined = undefined;',
      'parent.iObject = {};',
      'parent.iError = new Error();',
      '</script>',
    ].join('\n'),
  );
  iDoc.close();

  QUnit.test('isEqual', assert => {
    assert.notOk(_.isEqual(iNumber, 101));
    assert.ok(_.isEqual(iNumber, 100));

    // Objects from another frame.
    assert.ok(_.isEqual({}, iObject), 'Objects with equivalent members created in different documents are equal');

    // Array from another frame.
    assert.ok(_.isEqual([1, 2, 3], iArray), 'Arrays with equivalent elements created in different documents are equal');
  });

  QUnit.test('isEmpty', assert => {
    assert.notOk(_([iNumber]).isEmpty(), '[1] is not empty');
    assert.notOk(_.isEmpty(iArray), '[] is empty');
    assert.ok(_.isEmpty(iObject), '{} is empty');
  });

  QUnit.test('isElement', assert => {
    assert.notOk(_.isElement('div'), 'strings are not dom elements');
    assert.ok(_.isElement(document.body), 'the body tag is a DOM element');
    assert.ok(_.isElement(iElement), 'even from another frame');
  });

  QUnit.test('isArguments', assert => {
    assert.ok(_.isArguments(iArguments), 'even from another frame');
  });

  QUnit.test('isObject', assert => {
    assert.ok(_.isObject(iElement), 'even from another frame');
    assert.ok(_.isObject(iFunction), 'even from another frame');
  });

  QUnit.test('isArray', assert => {
    assert.ok(_.isArray(iArray), 'even from another frame');
  });

  QUnit.test('isString', assert => {
    assert.ok(_.isString(iString), 'even from another frame');
  });

  QUnit.test('isNumber', assert => {
    assert.ok(_.isNumber(iNumber), 'even from another frame');
  });

  QUnit.test('isBoolean', assert => {
    assert.ok(_.isBoolean(iBoolean), 'even from another frame');
  });

  QUnit.test('isFunction', assert => {
    assert.ok(_.isFunction(iFunction), 'even from another frame');
  });

  QUnit.test('isDate', assert => {
    assert.ok(_.isDate(iDate), 'even from another frame');
  });

  QUnit.test('isRegExp', assert => {
    assert.ok(_.isRegExp(iRegExp), 'even from another frame');
  });

  QUnit.test('isNaN', assert => {
    assert.ok(_.isNaN(iNaN), 'even from another frame');
  });

  QUnit.test('isNull', assert => {
    assert.ok(_.isNull(iNull), 'even from another frame');
  });

  QUnit.test('isUndefined', assert => {
    assert.ok(_.isUndefined(iUndefined), 'even from another frame');
  });

  QUnit.test('isError', assert => {
    assert.ok(_.isError(iError), 'even from another frame');
  });

  if (typeof ActiveXObject !== 'undefined') {
    QUnit.test('IE host objects', assert => {
      const xml = new ActiveXObject('Msxml2.DOMDocument.3.0');
      assert.notOk(_.isNumber(xml));
      assert.notOk(_.isBoolean(xml));
      assert.notOk(_.isNaN(xml));
      assert.notOk(_.isFunction(xml));
      assert.notOk(_.isNull(xml));
      assert.notOk(_.isUndefined(xml));
    });

    QUnit.test('#1621 IE 11 compat mode DOM elements are not functions', assert => {
      const fn = function () {};
      const xml = new ActiveXObject('Msxml2.DOMDocument.3.0');
      const div = document.createElement('div');

      // JIT the function
      let count = 200;
      while (count--) {
        _.isFunction(fn);
      }

      assert.equal(_.isFunction(xml), false);
      assert.equal(_.isFunction(div), false);
      assert.equal(_.isFunction(fn), true);
    });
  }
}());

(function () {
  const _ = typeof require === 'function' ? require('..') : window._;
  let templateSettings;

  QUnit.module('Utility', {

    beforeEach() {
      templateSettings = _.clone(_.templateSettings);
    },

    afterEach() {
      _.templateSettings = templateSettings;
    },

  });

  if (typeof this === 'object') {
    QUnit.test('noConflict', function (assert) {
      const underscore = _.noConflict();
      assert.equal(underscore.identity(1), 1);
      if (typeof require !== 'function') {
        assert.equal(this._, void 0, 'global underscore is removed');
        this._ = underscore;
      } else if (typeof global !== 'undefined') {
        delete global._;
      }
    });
  }

  if (typeof require === 'function') {
    QUnit.test('noConflict (node vm)', assert => {
      assert.expect(2);
      const done = assert.async();
      const fs = require('fs');
      const vm = require('vm');
      const filename = `${__dirname}/../underscore.js`;
      fs.readFile(filename, (err, content) => {
        const sandbox = vm.createScript(
          `${content}this.underscore = this._.noConflict();`,
          filename,
        );
        const context = { _: 'oldvalue' };
        sandbox.runInNewContext(context);
        assert.equal(context._, 'oldvalue');
        assert.equal(context.underscore.VERSION, _.VERSION);

        done();
      });
    });
  }

  QUnit.test('#750 - Return _ instance.', assert => {
    assert.expect(2);
    const instance = _([]);
    assert.strictEqual(_(instance), instance);
    assert.strictEqual(new _(instance), instance);
  });

  QUnit.test('identity', assert => {
    const stooge = { name: 'moe' };
    assert.equal(_.identity(stooge), stooge, 'stooge is the same as his identity');
  });

  QUnit.test('constant', assert => {
    const stooge = { name: 'moe' };
    assert.equal(_.constant(stooge)(), stooge, 'should create a function that returns stooge');
  });

  QUnit.test('noop', assert => {
    assert.strictEqual(_.noop('curly', 'larry', 'moe'), void 0, 'should always return undefined');
  });

  QUnit.test('property', assert => {
    const stooge = { name: 'moe' };
    assert.equal(_.property('name')(stooge), 'moe', 'should return the property with the given name');
    assert.equal(_.property('name')(null), void 0, 'should return undefined for null values');
    assert.equal(_.property('name')(void 0), void 0, 'should return undefined for undefined values');
  });

  QUnit.test('propertyOf', assert => {
    const stoogeRanks = _.propertyOf({ curly: 2, moe: 1, larry: 3 });
    assert.equal(stoogeRanks('curly'), 2, 'should return the property with the given name');
    assert.equal(stoogeRanks(null), void 0, 'should return undefined for null values');
    assert.equal(stoogeRanks(void 0), void 0, 'should return undefined for undefined values');

    /**
     *
     */
    function MoreStooges() { this.shemp = 87; }
    MoreStooges.prototype = { curly: 2, moe: 1, larry: 3 };
    const moreStoogeRanks = _.propertyOf(new MoreStooges());
    assert.equal(moreStoogeRanks('curly'), 2, 'should return properties from further up the prototype chain');

    const nullPropertyOf = _.propertyOf(null);
    assert.equal(nullPropertyOf('curly'), void 0, 'should return undefined when obj is null');

    const undefPropertyOf = _.propertyOf(void 0);
    assert.equal(undefPropertyOf('curly'), void 0, 'should return undefined when obj is undefined');
  });

  QUnit.test('random', assert => {
    const array = _.range(1000);
    const min = 2 ** 31;
    const max = 2 ** 62;

    assert.ok(_.every(array, () => _.random(min, max) >= min), 'should produce a random number greater than or equal to the minimum number');

    assert.ok(_.some(array, () => _.random(Number.MAX_VALUE) > 0), 'should produce a random number when passed `Number.MAX_VALUE`');
  });

  QUnit.test('now', assert => {
    const diff = _.now() - new Date().getTime();
    assert.ok(diff <= 0 && diff > -5, 'Produces the correct time in milliseconds');// within 5ms
  });

  QUnit.test('uniqueId', assert => {
    const ids = []; let
      i = 0;
    while (i++ < 100) ids.push(_.uniqueId());
    assert.equal(_.uniq(ids).length, ids.length, 'can generate a globally-unique stream of ids');
  });

  QUnit.test('times', assert => {
    let vals = [];
    _.times(3, i => { vals.push(i); });
    assert.deepEqual(vals, [0, 1, 2], 'is 0 indexed');
    //
    vals = [];
    _(3).times(i => { vals.push(i); });
    assert.deepEqual(vals, [0, 1, 2], 'works as a wrapper');
    // collects return values
    assert.deepEqual([0, 1, 2], _.times(3, i => i), 'collects return values');

    assert.deepEqual(_.times(0, _.identity), []);
    assert.deepEqual(_.times(-1, _.identity), []);
    assert.deepEqual(_.times(parseFloat('-Infinity'), _.identity), []);
  });

  QUnit.test('mixin', assert => {
    const ret = _.mixin({
      myReverse(string) {
        return string.split('').reverse().join('');
      },
    });
    assert.equal(ret, _, 'returns the _ object to facilitate chaining');
    assert.equal(_.myReverse('panacea'), 'aecanap', 'mixed in a function to _');
    assert.equal(_('champ').myReverse(), 'pmahc', 'mixed in a function to the OOP wrapper');
  });

  QUnit.test('_.escape', assert => {
    assert.equal(_.escape(null), '');
  });

  QUnit.test('_.unescape', assert => {
    const string = 'Curly & Moe';
    assert.equal(_.unescape(null), '');
    assert.equal(_.unescape(_.escape(string)), string);
    assert.equal(_.unescape(string), string, 'don\'t unescape unnecessarily');
  });

  // Don't care what they escape them to just that they're escaped and can be unescaped
  QUnit.test('_.escape & unescape', assert => {
    // test & (&amp;) seperately obviously
    const escapeCharacters = ['<', '>', '"', '\'', '`'];

    _.each(escapeCharacters, escapeChar => {
      let s = `a ${escapeChar} string escaped`;
      let e = _.escape(s);
      assert.notEqual(s, e, `${escapeChar} is escaped`);
      assert.equal(s, _.unescape(e), `${escapeChar} can be unescaped`);

      s = `a ${escapeChar}${escapeChar}${escapeChar}some more string${escapeChar}`;
      e = _.escape(s);

      assert.equal(e.indexOf(escapeChar), -1, `can escape multiple occurances of ${escapeChar}`);
      assert.equal(_.unescape(e), s, `multiple occurrences of ${escapeChar} can be unescaped`);
    });

    // handles multiple escape characters at once
    const joiner = ' other stuff ';
    let allEscaped = escapeCharacters.join(joiner);
    allEscaped += allEscaped;
    assert.ok(_.every(escapeCharacters, escapeChar => allEscaped.indexOf(escapeChar) !== -1), 'handles multiple characters');
    assert.ok(allEscaped.indexOf(joiner) >= 0, 'can escape multiple escape characters at the same time');

    // test & -> &amp;
    const str = 'some string & another string & yet another';
    const escaped = _.escape(str);

    assert.notStrictEqual(escaped.indexOf('&'), -1, 'handles & aka &amp;');
    assert.equal(_.unescape(str), str, 'can unescape &amp;');
  });

  QUnit.test('template', assert => {
    const basicTemplate = _.template("<%= thing %> is gettin' on my noives!");
    let result = basicTemplate({ thing: 'This' });
    assert.equal(result, "This is gettin' on my noives!", 'can do basic attribute interpolation');

    const sansSemicolonTemplate = _.template('A <% this %> B');
    assert.equal(sansSemicolonTemplate(), 'A  B');

    const backslashTemplate = _.template('<%= thing %> is \\ridanculous');
    assert.equal(backslashTemplate({ thing: 'This' }), 'This is \\ridanculous');

    const escapeTemplate = _.template('<%= a ? "checked=\\"checked\\"" : "" %>');
    assert.equal(escapeTemplate({ a: true }), 'checked="checked"', 'can handle slash escapes in interpolations.');

    const fancyTemplate = _.template('<ul><% '
    + '  for (var key in people) { '
    + '%><li><%= people[key] %></li><% } %></ul>');
    result = fancyTemplate({ people: { moe: 'Moe', larry: 'Larry', curly: 'Curly' } });
    assert.equal(result, '<ul><li>Moe</li><li>Larry</li><li>Curly</li></ul>', 'can run arbitrary javascript in templates');

    const escapedCharsInJavascriptTemplate = _.template('<ul><% _.each(numbers.split("\\n"), function(item) { %><li><%= item %></li><% }) %></ul>');
    result = escapedCharsInJavascriptTemplate({ numbers: 'one\ntwo\nthree\nfour' });
    assert.equal(result, '<ul><li>one</li><li>two</li><li>three</li><li>four</li></ul>', 'Can use escaped characters (e.g. \\n) in JavaScript');

    const namespaceCollisionTemplate = _.template('<%= pageCount %> <%= thumbnails[pageCount] %> <% _.each(thumbnails, function(p) { %><div class="thumbnail" rel="<%= p %>"></div><% }); %>');
    result = namespaceCollisionTemplate({
      pageCount: 3,
      thumbnails: {
        1: 'p1-thumbnail.gif',
        2: 'p2-thumbnail.gif',
        3: 'p3-thumbnail.gif',
      },
    });
    assert.equal(result, '3 p3-thumbnail.gif <div class="thumbnail" rel="p1-thumbnail.gif"></div><div class="thumbnail" rel="p2-thumbnail.gif"></div><div class="thumbnail" rel="p3-thumbnail.gif"></div>');

    const noInterpolateTemplate = _.template('<div><p>Just some text. Hey, I know this is silly but it aids consistency.</p></div>');
    result = noInterpolateTemplate();
    assert.equal(result, '<div><p>Just some text. Hey, I know this is silly but it aids consistency.</p></div>');

    const quoteTemplate = _.template("It's its, not it's");
    assert.equal(quoteTemplate({}), "It's its, not it's");

    let quoteInStatementAndBody = _.template('<% '
    + "  if(foo == 'bar'){ "
    + "%>Statement quotes and 'quotes'.<% } %>");
    assert.equal(quoteInStatementAndBody({ foo: 'bar' }), "Statement quotes and 'quotes'.");

    const withNewlinesAndTabs = _.template('This\n\t\tis: <%= x %>.\n\tok.\nend.');
    assert.equal(withNewlinesAndTabs({ x: 'that' }), 'This\n\t\tis: that.\n\tok.\nend.');

    let template = _.template('<i><%- value %></i>');
    result = template({ value: '<script>' });
    assert.equal(result, '<i>&lt;script&gt;</i>');

    const stooge = {
      name: 'Moe',
      template: _.template("I'm <%= this.name %>"),
    };
    assert.equal(stooge.template(), "I'm Moe");

    template = _.template('\n '
    + '  <%\n '
    + '  // a comment\n '
    + '  if (data) { data += 12345; }; %>\n '
    + '  <li><%= data %></li>\n ');
    assert.equal(template({ data: 12345 }).replace(/\s/g, ''), '<li>24690</li>');

    _.templateSettings = {
      evaluate: /\{\{([\s\S]+?)\}\}/g,
      interpolate: /\{\{=([\s\S]+?)\}\}/g,
    };

    const custom = _.template('<ul>{{ for (var key in people) { }}<li>{{= people[key] }}</li>{{ } }}</ul>');
    result = custom({ people: { moe: 'Moe', larry: 'Larry', curly: 'Curly' } });
    assert.equal(result, '<ul><li>Moe</li><li>Larry</li><li>Curly</li></ul>', 'can run arbitrary javascript in templates');

    const customQuote = _.template("It's its, not it's");
    assert.equal(customQuote({}), "It's its, not it's");

    quoteInStatementAndBody = _.template("{{ if(foo == 'bar'){ }}Statement quotes and 'quotes'.{{ } }}");
    assert.equal(quoteInStatementAndBody({ foo: 'bar' }), "Statement quotes and 'quotes'.");

    _.templateSettings = {
      evaluate: /<\?([\s\S]+?)\?>/g,
      interpolate: /<\?=([\s\S]+?)\?>/g,
    };

    const customWithSpecialChars = _.template('<ul><? for (var key in people) { ?><li><?= people[key] ?></li><? } ?></ul>');
    result = customWithSpecialChars({ people: { moe: 'Moe', larry: 'Larry', curly: 'Curly' } });
    assert.equal(result, '<ul><li>Moe</li><li>Larry</li><li>Curly</li></ul>', 'can run arbitrary javascript in templates');

    const customWithSpecialCharsQuote = _.template("It's its, not it's");
    assert.equal(customWithSpecialCharsQuote({}), "It's its, not it's");

    quoteInStatementAndBody = _.template("<? if(foo == 'bar'){ ?>Statement quotes and 'quotes'.<? } ?>");
    assert.equal(quoteInStatementAndBody({ foo: 'bar' }), "Statement quotes and 'quotes'.");

    _.templateSettings = {
      interpolate: /\{\{(.+?)\}\}/g,
    };

    const mustache = _.template('Hello {{planet}}!');
    assert.equal(mustache({ planet: 'World' }), 'Hello World!', 'can mimic mustache.js');

    const templateWithNull = _.template('a null undefined {{planet}}');
    assert.equal(templateWithNull({ planet: 'world' }), 'a null undefined world', 'can handle missing escape and evaluate settings');
  });

  QUnit.test('_.template provides the generated function source, when a SyntaxError occurs', assert => {
    let source;
    try {
      _.template('<b><%= if x %></b>');
    } catch (ex) {
      source = ex.source;
    }
    assert.ok(/__p/.test(source));
  });

  QUnit.test('_.template handles \\u2028 & \\u2029', assert => {
    const tmpl = _.template('<p>\u2028<%= "\\u2028\\u2029" %>\u2029</p>');
    assert.strictEqual(tmpl(), '<p>\u2028\u2028\u2029\u2029</p>');
  });

  QUnit.test('result calls functions and returns primitives', assert => {
    const obj = { w: '', x: 'x', y() { return this.x; } };
    assert.strictEqual(_.result(obj, 'w'), '');
    assert.strictEqual(_.result(obj, 'x'), 'x');
    assert.strictEqual(_.result(obj, 'y'), 'x');
    assert.strictEqual(_.result(obj, 'z'), void 0);
    assert.strictEqual(_.result(null, 'x'), void 0);
  });

  QUnit.test('result returns a default value if object is null or undefined', assert => {
    assert.strictEqual(_.result(null, 'b', 'default'), 'default');
    assert.strictEqual(_.result(void 0, 'c', 'default'), 'default');
    assert.strictEqual(_.result(''.match('missing'), 1, 'default'), 'default');
  });

  QUnit.test('result returns a default value if property of object is missing', assert => {
    assert.strictEqual(_.result({ d: null }, 'd', 'default'), null);
    assert.strictEqual(_.result({ e: false }, 'e', 'default'), false);
  });

  QUnit.test('result only returns the default value if the object does not have the property or is undefined', assert => {
    assert.strictEqual(_.result({}, 'b', 'default'), 'default');
    assert.strictEqual(_.result({ d: void 0 }, 'd', 'default'), 'default');
  });

  QUnit.test('result does not return the default if the property of an object is found in the prototype', assert => {
    const Foo = function () {};
    Foo.prototype.bar = 1;
    assert.strictEqual(_.result(new Foo(), 'bar', 2), 1);
  });

  QUnit.test('result does use the fallback when the result of invoking the property is undefined', assert => {
    const obj = { a() {} };
    assert.strictEqual(_.result(obj, 'a', 'failed'), void 0);
  });

  QUnit.test('result fallback can use a function', assert => {
    const obj = { a: [1, 2, 3] };
    assert.strictEqual(_.result(obj, 'b', _.constant(5)), 5);
    assert.strictEqual(_.result(obj, 'b', function () {
      return this.a;
    }), obj.a, 'called with context');
  });

  QUnit.test('_.templateSettings.variable', assert => {
    const s = '<%=data.x%>';
    const data = { x: 'x' };
    const tmp = _.template(s, { variable: 'data' });
    assert.strictEqual(tmp(data), 'x');
    _.templateSettings.variable = 'data';
    assert.strictEqual(_.template(s)(data), 'x');
  });

  QUnit.test('#547 - _.templateSettings is unchanged by custom settings.', assert => {
    assert.notOk(_.templateSettings.variable);
    _.template('', {}, { variable: 'x' });
    assert.notOk(_.templateSettings.variable);
  });

  QUnit.test('#556 - undefined template variables.', assert => {
    const template = _.template('<%=x%>');
    assert.strictEqual(template({ x: null }), '');
    assert.strictEqual(template({ x: void 0 }), '');

    const templateEscaped = _.template('<%-x%>');
    assert.strictEqual(templateEscaped({ x: null }), '');
    assert.strictEqual(templateEscaped({ x: void 0 }), '');

    const templateWithProperty = _.template('<%=x.foo%>');
    assert.strictEqual(templateWithProperty({ x: {} }), '');
    assert.strictEqual(templateWithProperty({ x: {} }), '');

    const templateWithPropertyEscaped = _.template('<%-x.foo%>');
    assert.strictEqual(templateWithPropertyEscaped({ x: {} }), '');
    assert.strictEqual(templateWithPropertyEscaped({ x: {} }), '');
  });

  QUnit.test('interpolate evaluates code only once.', assert => {
    assert.expect(2);
    let count = 0;
    const template = _.template('<%= f() %>');
    template({ f() { assert.notOk(count++); } });

    let countEscaped = 0;
    const templateEscaped = _.template('<%- f() %>');
    templateEscaped({ f() { assert.notOk(countEscaped++); } });
  });

  QUnit.test('#746 - _.template settings are not modified.', assert => {
    assert.expect(1);
    const settings = {};
    _.template('', null, settings);
    assert.deepEqual(settings, {});
  });

  QUnit.test('#779 - delimeters are applied to unescaped text.', assert => {
    assert.expect(1);
    const template = _.template('<<\nx\n>>', null, { evaluate: /<<(.*?)>>/g });
    assert.strictEqual(template(), '<<\nx\n>>');
  });
}());

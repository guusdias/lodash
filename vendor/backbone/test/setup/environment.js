(function (QUnit) {
  const { sync } = Backbone;
  const { ajax } = Backbone;
  const { emulateHTTP } = Backbone;
  const { emulateJSON } = Backbone;
  const { history } = window;
  const { pushState } = history;
  const { replaceState } = history;

  QUnit.config.noglobals = true;

  QUnit.testStart(() => {
    const env = QUnit.config.current.testEnvironment;

    // We never want to actually call these during tests.
    history.pushState = history.replaceState = function () {};

    // Capture ajax settings for comparison.
    Backbone.ajax = function (settings) {
      env.ajaxSettings = settings;
    };

    // Capture the arguments to Backbone.sync for comparison.
    Backbone.sync = function (method, model, options) {
      env.syncArgs = {
        method,
        model,
        options,
      };
      sync.apply(this, arguments);
    };
  });

  QUnit.testDone(() => {
    Backbone.sync = sync;
    Backbone.ajax = ajax;
    Backbone.emulateHTTP = emulateHTTP;
    Backbone.emulateJSON = emulateJSON;
    history.pushState = pushState;
    history.replaceState = replaceState;
  });
}(QUnit));

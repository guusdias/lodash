/** Environment shortcut. */
const { env } = process;

/** Load Node.js modules. */
const { EventEmitter } = require('events');
const http = require('http');
const path = require('path');
const url = require('url');
const util = require('util');

/** Load other modules. */
const chalk = require('chalk');
const ecstatic = require('ecstatic');
const request = require('request');
const SauceTunnel = require('sauce-tunnel');

const _ = require('../lodash.js');

/** Used for Sauce Labs credentials. */
const accessKey = env.SAUCE_ACCESS_KEY;
const username = env.SAUCE_USERNAME;

/** Used as the default maximum number of times to retry a job and tunnel. */
const maxJobRetries = 3;
const maxTunnelRetries = 3;

/** Used as the static file server middleware. */
const mount = ecstatic({
  cache: 'no-cache',
  root: process.cwd(),
});

/** Used as the list of ports supported by Sauce Connect. */
const ports = [
  80, 443, 888, 2000, 2001, 2020, 2109, 2222, 2310, 3000, 3001, 3030, 3210,
  3333, 4000, 4001, 4040, 4321, 4502, 4503, 4567, 5000, 5001, 5050, 5555, 5432,
  6000, 6001, 6060, 6666, 6543, 7000, 7070, 7774, 7777, 8000, 8001, 8003, 8031,
  8080, 8081, 8765, 8777, 8888, 9000, 9001, 9080, 9090, 9876, 9877, 9999, 49221,
  55001,
];

/** Used by `logInline` to clear previously logged messages. */
let prevLine = '';

/** Method shortcut. */
const { push } = Array.prototype;

/** Used to detect error messages. */
const reError = /(?:\be|E)rror\b/;

/** Used to detect valid job ids. */
const reJobId = /^[a-z0-9]{32}$/;

/** Used to display the wait throbber. */
const throbberDelay = 500;
let waitCount = -1;

/**
 * Used as Sauce Labs config values.
 * See the [Sauce Labs documentation](https://docs.saucelabs.com/reference/test-configuration/)
 * for more details.
 */
const advisor = getOption('advisor', false);
const build = getOption('build', (env.TRAVIS_COMMIT || '').slice(0, 10));
const commandTimeout = getOption('commandTimeout', 90);
const compatMode = getOption('compatMode', null);
const customData = Function(`return {${getOption('customData', '').replace(/^\{|}$/g, '')}}`)();
const deviceOrientation = getOption('deviceOrientation', 'portrait');
const framework = getOption('framework', 'qunit');
const idleTimeout = getOption('idleTimeout', 60);
const jobName = getOption('name', 'unit tests');
const maxDuration = getOption('maxDuration', 180);
const port = ports[Math.min(_.sortedIndex(ports, getOption('port', 9001)), ports.length - 1)];
const publicAccess = getOption('public', true);
const queueTimeout = getOption('queueTimeout', 240);
const recordVideo = getOption('recordVideo', true);
const recordScreenshots = getOption('recordScreenshots', false);
const runner = getOption('runner', 'test/index.html').replace(/^\W+/, '');
const runnerUrl = getOption('runnerUrl', `http://localhost:${port}/${runner}`);
const statusInterval = getOption('statusInterval', 5);
const tags = getOption('tags', []);
const throttled = getOption('throttled', 10);
const tunneled = getOption('tunneled', true);
const tunnelId = getOption('tunnelId', `tunnel_${env.TRAVIS_JOB_ID || 0}`);
const tunnelTimeout = getOption('tunnelTimeout', 120);
const videoUploadOnPass = getOption('videoUploadOnPass', false);

/** Used to convert Sauce Labs browser identifiers to their formal names. */
const browserNameMap = {
  googlechrome: 'Chrome',
  iehta: 'Internet Explorer',
  ipad: 'iPad',
  iphone: 'iPhone',
  microsoftedge: 'Edge',
};

/** List of platforms to load the runner on. */
let platforms = [
  ['Linux', 'android', '5.1'],
  ['Windows 10', 'chrome', '54'],
  ['Windows 10', 'chrome', '53'],
  ['Windows 10', 'firefox', '50'],
  ['Windows 10', 'firefox', '49'],
  ['Windows 10', 'microsoftedge', '14'],
  ['Windows 10', 'internet explorer', '11'],
  ['Windows 8', 'internet explorer', '10'],
  ['Windows 7', 'internet explorer', '9'],
  ['macOS 10.12', 'safari', '10'],
  ['OS X 10.11', 'safari', '9'],
];

/** Used to tailor the `platforms` array. */
const isAMD = _.includes(tags, 'amd');
const isBackbone = _.includes(tags, 'backbone');
const isModern = _.includes(tags, 'modern');

// The platforms to test IE compatibility modes.
if (compatMode) {
  platforms = [
    ['Windows 10', 'internet explorer', '11'],
    ['Windows 8', 'internet explorer', '10'],
    ['Windows 7', 'internet explorer', '9'],
    ['Windows 7', 'internet explorer', '8'],
  ];
}
// The platforms for AMD tests.
if (isAMD) {
  platforms = _.filter(platforms, platform => {
    const browser = browserName(platform[1]);
    const version = +platform[2];

    switch (browser) {
      case 'Android': return version >= 4.4;
      case 'Opera': return version >= 10;
    }
    return true;
  });
}
// The platforms for Backbone tests.
if (isBackbone) {
  platforms = _.filter(platforms, platform => {
    const browser = browserName(platform[1]);
    const version = +platform[2];

    switch (browser) {
      case 'Firefox': return version >= 4;
      case 'Internet Explorer': return version >= 7;
      case 'iPad': return version >= 5;
      case 'Opera': return version >= 12;
    }
    return true;
  });
}
// The platforms for modern builds.
if (isModern) {
  platforms = _.filter(platforms, platform => {
    const browser = browserName(platform[1]);
    const version = +platform[2];

    switch (browser) {
      case 'Android': return version >= 4.1;
      case 'Firefox': return version >= 10;
      case 'Internet Explorer': return version >= 9;
      case 'iPad': return version >= 6;
      case 'Opera': return version >= 12;
      case 'Safari': return version >= 6;
    }
    return true;
  });
}

/** Used as the default `Job` options object. */
const jobOptions = {
  build,
  'command-timeout': commandTimeout,
  'custom-data': customData,
  'device-orientation': deviceOrientation,
  framework,
  'idle-timeout': idleTimeout,
  'max-duration': maxDuration,
  name: jobName,
  public: publicAccess,
  platforms,
  'record-screenshots': recordScreenshots,
  'record-video': recordVideo,
  'sauce-advisor': advisor,
  tags,
  url: runnerUrl,
  'video-upload-on-pass': videoUploadOnPass,
};

if (publicAccess === true) {
  jobOptions.public = 'public';
}
if (tunneled) {
  jobOptions['tunnel-identifier'] = tunnelId;
}

/*----------------------------------------------------------------------------*/

/**
 * Resolves the formal browser name for a given Sauce Labs browser identifier.
 * @private
 * @param {string} identifier The browser identifier.
 * @returns {string} Returns the formal browser name.
 */
function browserName(identifier) {
  return browserNameMap[identifier] || _.startCase(identifier);
}

/**
 * Gets the value for the given option name. If no value is available the
 * `defaultValue` is returned.
 * @private
 * @param {string} name The name of the option.
 * @param {*} defaultValue The default option value.
 * @returns {*} Returns the option value.
 */
function getOption(name, defaultValue) {
  const isArr = _.isArray(defaultValue);
  return _.reduce(process.argv, (result, value) => {
    if (isArr) {
      value = optionToArray(name, value);
      return _.isEmpty(value) ? result : value;
    }
    value = optionToValue(name, value);

    return value == null ? result : value;
  }, defaultValue);
}

/**
 * Checks if `value` is a job ID.
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a job ID, else `false`.
 */
function isJobId(value) {
  return reJobId.test(value);
}

/**
 * Writes an inline message to standard output.
 * @private
 * @param {string} [text] The text to log.
 */
function logInline(text) {
  const blankLine = _.repeat(' ', _.size(prevLine));
  prevLine = text = _.truncate(text, { length: 40 });
  process.stdout.write(`${text + blankLine.slice(text.length)}\r`);
}

/**
 * Writes the wait throbber to standard output.
 * @private
 */
function logThrobber() {
  logInline(`Please wait${_.repeat('.', (++waitCount % 3) + 1)}`);
}

/**
 * Converts a comma separated option value into an array.
 * @private
 * @param {string} name The name of the option to inspect.
 * @param {string} string The options string.
 * @returns {Array} Returns the new converted array.
 */
function optionToArray(name, string) {
  return _.compact(_.invokeMap((optionToValue(name, string) || '').split(/, */), 'trim'));
}

/**
 * Extracts the option value from an option string.
 * @private
 * @param {string} name The name of the option to inspect.
 * @param {string} string The options string.
 * @returns {string|undefined} Returns the option value, else `undefined`.
 */
function optionToValue(name, string) {
  let result = string.match(RegExp(`^${name}(?:=([\\s\\S]+))?$`));
  if (result) {
    result = _.get(result, 1);
    result = result ? _.trim(result) : true;
  }
  if (result === 'false') {
    return false;
  }
  return result || undefined;
}

/*----------------------------------------------------------------------------*/

/**
 * The `Job#remove` and `Tunnel#stop` callback used by `Jobs#restart`
 * and `Tunnel#restart` respectively.
 * @private
 */
function onGenericRestart() {
  this.restarting = false;
  this.emit('restart');
  this.start();
}

/**
 * The `request.put` and `SauceTunnel#stop` callback used by `Jobs#stop`
 * and `Tunnel#stop` respectively.
 * @private
 * @param {object} [error] The error object.
 */
function onGenericStop(error) {
  this.running = this.stopping = false;
  this.emit('stop', error);
}

/**
 * The `request.del` callback used by `Jobs#remove`.
 * @param error
 * @param res
 * @param body
 * @private
 */
function onJobRemove(error, res, body) {
  this.id = this.taskId = this.url = null;
  this.removing = false;
  this.emit('remove');
}

/**
 * The `Job#remove` callback used by `Jobs#reset`.
 * @private
 */
function onJobReset() {
  this.attempts = 0;
  this.failed = this.resetting = false;
  this._pollerId = this.id = this.result = this.taskId = this.url = null;
  this.emit('reset');
}

/**
 * The `request.post` callback used by `Jobs#start`.
 * @private
 * @param {object} [error] The error object.
 * @param {object} res The response data object.
 * @param {object} body The response body JSON object.
 */
function onJobStart(error, res, body) {
  this.starting = false;

  if (this.stopping) {
    return;
  }
  const statusCode = _.get(res, 'statusCode');
  const taskId = _.first(_.get(body, 'js tests'));

  if (error || !taskId || statusCode != 200) {
    if (this.attempts < this.retries) {
      this.restart();
      return;
    }
    const na = 'unavailable';
    const bodyStr = _.isObject(body) ? `\n${JSON.stringify(body)}` : na;
    const statusStr = _.isFinite(statusCode) ? statusCode : na;

    logInline();
    console.error('Failed to start job; status: %s, body: %s', statusStr, bodyStr);
    if (error) {
      console.error(error);
    }
    this.failed = true;
    this.emit('complete');
    return;
  }
  this.running = true;
  this.taskId = taskId;
  this.timestamp = _.now();
  this.emit('start');
  this.status();
}

/**
 * The `request.post` callback used by `Job#status`.
 * @private
 * @param {object} [error] The error object.
 * @param {object} res The response data object.
 * @param {object} body The response body JSON object.
 */
function onJobStatus(error, res, body) {
  this.checking = false;

  if (!this.running || this.stopping) {
    return;
  }
  let completed = _.get(body, 'completed', false);
  const data = _.first(_.get(body, 'js tests'));
  const elapsed = (_.now() - this.timestamp) / 1000;
  const jobId = _.get(data, 'job_id', null);
  let jobResult = _.get(data, 'result', null);
  const jobStatus = _.get(data, 'status', '');
  const jobUrl = _.get(data, 'url', null);
  const expired = (elapsed >= queueTimeout && !_.includes(jobStatus, 'in progress'));
  const { options } = this;
  const platform = options.platforms[0];

  if (_.isObject(jobResult)) {
    var message = _.get(jobResult, 'message');
  } else {
    if (typeof jobResult === 'string') {
      message = jobResult;
    }
    jobResult = null;
  }
  if (isJobId(jobId)) {
    this.id = jobId;
    this.result = jobResult;
    this.url = jobUrl;
  } else {
    completed = false;
  }
  this.emit('status', jobStatus);

  if (!completed && !expired) {
    this._pollerId = _.delay(_.bind(this.status, this), this.statusInterval * 1000);
    return;
  }
  const description = `${browserName(platform[1])} ${platform[2]} on ${_.startCase(platform[0])}`;
  const errored = !jobResult || !jobResult.passed || reError.test(message) || reError.test(jobStatus);
  const failures = _.get(jobResult, 'failed');
  const label = `${options.name}:`;
  const { tunnel } = this;

  if (errored || failures) {
    if (errored && this.attempts < this.retries) {
      this.restart();
      return;
    }
    const details = `See ${jobUrl} for details.`;
    this.failed = true;

    logInline();
    if (failures) {
      console.error(`${label} %s ${chalk.red('failed')} %d test${failures > 1 ? 's' : ''}. %s`, description, failures, details);
    } else if (tunnel.attempts < tunnel.retries) {
      tunnel.restart();
      return;
    } else {
      if (message === undefined) {
        message = `Results are unavailable. ${details}`;
      }
      console.error(label, description, `${chalk.red('failed')};`, message);
    }
  } else {
    logInline();
    console.log(label, description, chalk.green('passed'));
  }
  this.running = false;
  this.emit('complete');
}

/**
 * The `SauceTunnel#start` callback used by `Tunnel#start`.
 * @private
 * @param {boolean} success The connection success indicator.
 */
function onTunnelStart(success) {
  this.starting = false;

  if (this._timeoutId) {
    clearTimeout(this._timeoutId);
    this._timeoutId = null;
  }
  if (!success) {
    if (this.attempts < this.retries) {
      this.restart();
      return;
    }
    logInline();
    console.error('Failed to open Sauce Connect tunnel');
    process.exit(2);
  }
  logInline();
  console.log('Sauce Connect tunnel opened');

  const { jobs } = this;
  push.apply(jobs.queue, jobs.all);

  this.running = true;
  this.emit('start');

  console.log('Starting jobs...');
  this.dequeue();
}

/*----------------------------------------------------------------------------*/

/**
 * The Job constructor.
 * @private
 * @param {object} [properties] The properties to initialize a job with.
 */
function Job(properties) {
  EventEmitter.call(this);

  this.options = {};
  _.merge(this, properties);
  _.defaults(this.options, _.cloneDeep(jobOptions));

  this.attempts = 0;
  this.checking = this.failed = this.removing = this.resetting = this.restarting = this.running = this.starting = this.stopping = false;
  this._pollerId = this.id = this.result = this.taskId = this.url = null;
}

util.inherits(Job, EventEmitter);

/**
 * Removes the job.
 * @memberOf Job
 * @param {Function} callback The function called once the job is removed.
 * @param {object} Returns the job instance.
 */
Job.prototype.remove = function (callback) {
  this.once('remove', _.iteratee(callback));
  if (this.removing) {
    return this;
  }
  this.removing = true;
  return this.stop(function () {
    const onRemove = _.bind(onJobRemove, this);
    if (!this.id) {
      _.defer(onRemove);
      return;
    }
    request.del(_.template('https://saucelabs.com/rest/v1/${user}/jobs/${id}')(this), {
      auth: { user: this.user, pass: this.pass },
    }, onRemove);
  });
};

/**
 * Resets the job.
 * @memberOf Job
 * @param {Function} callback The function called once the job is reset.
 * @param {object} Returns the job instance.
 */
Job.prototype.reset = function (callback) {
  this.once('reset', _.iteratee(callback));
  if (this.resetting) {
    return this;
  }
  this.resetting = true;
  return this.remove(onJobReset);
};

/**
 * Restarts the job.
 * @memberOf Job
 * @param {Function} callback The function called once the job is restarted.
 * @param {object} Returns the job instance.
 */
Job.prototype.restart = function (callback) {
  this.once('restart', _.iteratee(callback));
  if (this.restarting) {
    return this;
  }
  this.restarting = true;

  const { options } = this;
  const platform = options.platforms[0];
  const description = `${browserName(platform[1])} ${platform[2]} on ${_.startCase(platform[0])}`;
  const label = `${options.name}:`;

  logInline();
  console.log('%s %s restart %d of %d', label, description, ++this.attempts, this.retries);

  return this.remove(onGenericRestart);
};

/**
 * Starts the job.
 * @memberOf Job
 * @param {Function} callback The function called once the job is started.
 * @param {object} Returns the job instance.
 */
Job.prototype.start = function (callback) {
  this.once('start', _.iteratee(callback));
  if (this.starting || this.running) {
    return this;
  }
  this.starting = true;
  request.post(_.template('https://saucelabs.com/rest/v1/${user}/js-tests')(this), {
    auth: { user: this.user, pass: this.pass },
    json: this.options,
  }, _.bind(onJobStart, this));

  return this;
};

/**
 * Checks the status of a job.
 * @memberOf Job
 * @param {Function} callback The function called once the status is resolved.
 * @param {object} Returns the job instance.
 */
Job.prototype.status = function (callback) {
  this.once('status', _.iteratee(callback));
  if (this.checking || this.removing || this.resetting || this.restarting || this.starting || this.stopping) {
    return this;
  }
  this._pollerId = null;
  this.checking = true;
  request.post(_.template('https://saucelabs.com/rest/v1/${user}/js-tests/status')(this), {
    auth: { user: this.user, pass: this.pass },
    json: { 'js tests': [this.taskId] },
  }, _.bind(onJobStatus, this));

  return this;
};

/**
 * Stops the job.
 * @memberOf Job
 * @param {Function} callback The function called once the job is stopped.
 * @param {object} Returns the job instance.
 */
Job.prototype.stop = function (callback) {
  this.once('stop', _.iteratee(callback));
  if (this.stopping) {
    return this;
  }
  this.stopping = true;
  if (this._pollerId) {
    clearTimeout(this._pollerId);
    this._pollerId = null;
    this.checking = false;
  }
  const onStop = _.bind(onGenericStop, this);
  if (!this.running || !this.id) {
    _.defer(onStop);
    return this;
  }
  request.put(_.template('https://saucelabs.com/rest/v1/${user}/jobs/${id}/stop')(this), {
    auth: { user: this.user, pass: this.pass },
  }, onStop);

  return this;
};

/*----------------------------------------------------------------------------*/

/**
 * The Tunnel constructor.
 * @private
 * @param {object} [properties] The properties to initialize the tunnel with.
 */
function Tunnel(properties) {
  EventEmitter.call(this);

  _.merge(this, properties);

  const active = [];
  const queue = [];

  const all = _.map(this.platforms, _.bind(function (platform) {
    return new Job(_.merge({
      user: this.user,
      pass: this.pass,
      tunnel: this,
      options: { platforms: [platform] },
    }, this.job));
  }, this));

  let completed = 0;
  const restarted = [];
  let success = true;
  const total = all.length;
  const tunnel = this;

  _.invokeMap(all, 'on', 'complete', function () {
    _.pull(active, this);
    if (success) {
      success = !this.failed;
    }
    if (++completed == total) {
      tunnel.stop(_.partial(tunnel.emit, 'complete', success));
      return;
    }
    tunnel.dequeue();
  });

  _.invokeMap(all, 'on', 'restart', function () {
    if (!_.includes(restarted, this)) {
      restarted.push(this);
    }
    // Restart tunnel if all active jobs have restarted.
    const threshold = Math.min(all.length, _.isFinite(throttled) ? throttled : 3);
    if (tunnel.attempts < tunnel.retries
        && active.length >= threshold && _.isEmpty(_.difference(active, restarted))) {
      tunnel.restart();
    }
  });

  this.on('restart', () => {
    completed = 0;
    success = true;
    restarted.length = 0;
  });

  this._timeoutId = null;
  this.attempts = 0;
  this.restarting = this.running = this.starting = this.stopping = false;
  this.jobs = { active, all, queue };
  this.connection = new SauceTunnel(this.user, this.pass, this.id, this.tunneled, ['-P', '0']);
}

util.inherits(Tunnel, EventEmitter);

/**
 * Restarts the tunnel.
 * @memberOf Tunnel
 * @param {Function} callback The function called once the tunnel is restarted.
 */
Tunnel.prototype.restart = function (callback) {
  this.once('restart', _.iteratee(callback));
  if (this.restarting) {
    return this;
  }
  this.restarting = true;

  logInline();
  console.log('Tunnel %s: restart %d of %d', this.id, ++this.attempts, this.retries);

  const { jobs } = this;
  const { active } = jobs;
  const { all } = jobs;

  const reset = _.after(all.length, _.bind(this.stop, this, onGenericRestart));
  const stop = _.after(active.length, _.partial(_.invokeMap, all, 'reset', reset));

  if (_.isEmpty(active)) {
    _.defer(stop);
  }
  if (_.isEmpty(all)) {
    _.defer(reset);
  }
  _.invokeMap(active, 'stop', function () {
    _.pull(active, this);
    stop();
  });

  if (this._timeoutId) {
    clearTimeout(this._timeoutId);
    this._timeoutId = null;
  }
  return this;
};

/**
 * Starts the tunnel.
 * @memberOf Tunnel
 * @param {Function} callback The function called once the tunnel is started.
 * @param {object} Returns the tunnel instance.
 */
Tunnel.prototype.start = function (callback) {
  this.once('start', _.iteratee(callback));
  if (this.starting || this.running) {
    return this;
  }
  this.starting = true;

  logInline();
  console.log('Opening Sauce Connect tunnel...');

  const onStart = _.bind(onTunnelStart, this);
  if (this.timeout) {
    this._timeoutId = _.delay(onStart, this.timeout * 1000, false);
  }
  this.connection.start(onStart);
  return this;
};

/**
 * Removes jobs from the queue and starts them.
 * @memberOf Tunnel
 * @param {object} Returns the tunnel instance.
 */
Tunnel.prototype.dequeue = function () {
  let count = 0;
  const { jobs } = this;
  const { active } = jobs;
  const { queue } = jobs;
  const { throttled } = this;

  while (queue.length && (active.length < throttled)) {
    const job = queue.shift();
    active.push(job);
    _.delay(_.bind(job.start, job), ++count * 1000);
  }
  return this;
};

/**
 * Stops the tunnel.
 * @memberOf Tunnel
 * @param {Function} callback The function called once the tunnel is stopped.
 * @param {object} Returns the tunnel instance.
 */
Tunnel.prototype.stop = function (callback) {
  this.once('stop', _.iteratee(callback));
  if (this.stopping) {
    return this;
  }
  this.stopping = true;

  logInline();
  console.log('Shutting down Sauce Connect tunnel...');

  const { jobs } = this;
  const { active } = jobs;

  const stop = _.after(active.length, _.bind(function () {
    const onStop = _.bind(onGenericStop, this);
    if (this.running) {
      this.connection.stop(onStop);
    } else {
      onStop();
    }
  }, this));

  jobs.queue.length = 0;
  if (_.isEmpty(active)) {
    _.defer(stop);
  }
  _.invokeMap(active, 'stop', function () {
    _.pull(active, this);
    stop();
  });

  if (this._timeoutId) {
    clearTimeout(this._timeoutId);
    this._timeoutId = null;
  }
  return this;
};

/*----------------------------------------------------------------------------*/

// Cleanup any inline logs when exited via `ctrl+c`.
process.on('SIGINT', () => {
  logInline();
  process.exit();
});

// Create a web server for the current working directory.
http.createServer((req, res) => {
  // See http://msdn.microsoft.com/en-us/library/ff955275(v=vs.85).aspx.
  if (compatMode && path.extname(url.parse(req.url).pathname) == '.html') {
    res.setHeader('X-UA-Compatible', `IE=${compatMode}`);
  }
  mount(req, res);
}).listen(port);

// Setup Sauce Connect so we can use this server from Sauce Labs.
const tunnel = new Tunnel({
  user: username,
  pass: accessKey,
  id: tunnelId,
  job: { retries: maxJobRetries, statusInterval },
  platforms,
  retries: maxTunnelRetries,
  throttled,
  tunneled,
  timeout: tunnelTimeout,
});

tunnel.on('complete', success => {
  process.exit(success ? 0 : 1);
});

tunnel.start();

setInterval(logThrobber, throbberDelay);

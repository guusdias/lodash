self.console || (self.console = { log() {} });

addEventListener('message', e => {
  if (e.data) {
    try {
      importScripts(`../${e.data}`);
    } catch (e) {
      const { lineNumber } = e;
      const message = (lineNumber == null ? '' : (`${lineNumber}: `)) + e.message;

      self._ = { VERSION: message };
    }
    postMessage(_.VERSION);
  }
});

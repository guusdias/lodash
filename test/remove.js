const fs = require('fs');
const path = require('path');

const _ = require('../lodash');

var args = (args = process.argv)
  .slice((args[0] === process.execPath || args[0] === 'node') ? 2 : 0);

const filePath = path.resolve(args[1]);
const reLine = /.*/gm;

const pattern = (function () {
  const result = args[0];
  const delimiter = result.charAt(0);
  const lastIndex = result.lastIndexOf(delimiter);

  return RegExp(result.slice(1, lastIndex), result.slice(lastIndex + 1));
}());

/*----------------------------------------------------------------------------*/

fs.writeFileSync(filePath, fs.readFileSync(filePath, 'utf8').replace(pattern, function (match) {
  const snippet = _.slice(arguments, -3, -2)[0];
  return match.replace(snippet, snippet.replace(reLine, ''));
}));

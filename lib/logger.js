'use strict';

var cluster = require('cluster');
var devNull = require('dev-null');
var logfmt  = require('logfmt');

module.exports = function createLogger(verbose) {
  if (typeof verbose === 'undefined') {
    verbose = true;
  }

  var source;

  if (cluster.isMaster) {
    source = 'teamster:master';
  } else {
    source = 'teamster:worker';
  }

  var logger = logfmt.namespace({
    source: source,
    pid   : process.pid
  });

  if (!verbose) {
    logger.stream = devNull();
  }

  return logger;
};

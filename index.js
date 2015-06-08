'use strict';

var cluster = require('cluster');
var master  = require('./lib/master');
var worker  = require('./lib/worker');

exports.run = function run(workerFunction, options) {
  options = options || {};

  if (options.fork === false) { return workerFunction(); }

  if (cluster.isMaster) {
    return master(options);
  } else {
    return worker(workerFunction, options);
  }
};

exports.runServer = function runServer(handler, options) {
  options = options || {};

  return exports.run(function runServerWorker() {
    var logger = require('./lib/logger')(options.verbose, options.logStream);

    return require('http')
      .createServer(handler)
      .listen(options.port, options.hostname, function onServer() {
        logger.log({ event: 'server listening on ' + this.address().port });
      });
  }, options);
};

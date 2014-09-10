'use strict';

var cluster = require('cluster');

module.exports = function worker(workerFunction, options) {
  var logger  = require('./logger')(options.verbose, options.logStream);

  process.once('SIGINT', function onInt() {
    logger.log({ event: 'received INT, immediately shutting down' });
    process.kill(process.pid, 'SIGINT');
  });

  process.on('SIGTERM', function onQuit() {
    logger.log({ event: 'received TERM, attempting graceful shutdown' });

    setTimeout(function() {
      logger.log({ event: 'shutdown timeout exceeded, forcing shutdown' });
      process.exit(1);
    }, options.timeout || 5000).unref();

    cluster.worker.disconnect();
  });

  workerFunction();
};

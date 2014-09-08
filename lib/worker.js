'use strict';

var cluster = require('cluster');
var logger  = require('./logger');

module.exports = function worker(workerFunction, options) {
  process.once('SIGINT', function() {
    logger.log({ event: 'received INT, immediately shutting down' });
    process.kill(process.pid, 'SIGINT');
  });

  process.once('SIGTERM', function() {
    logger.log({ event: 'received TERM, waiting for master to disconnect' });
  });

  process.on('SIGQUIT', function() {
    logger.log({ event: 'received QUIT, attempting graceful shutdown' });

    setTimeout(function() {
      logger.log({ event: 'shutdown timeout exceeded, forcing shutdown' });
      process.exit(1);
    }, options.timeout).unref();

    cluster.worker.disconnect();
  });

  workerFunction();
};

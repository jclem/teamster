'use strict';

var cluster = require('cluster');
var master  = require('./lib/master');
var worker  = require('./lib/worker');

exports.run = function run(workerFunction, options) {
  options = options || {};

  if (cluster.isMaster) {
    master(options);
  } else {
    worker(workerFunction, options);
  }
};

exports.runServer = function runServer(handler, options) {
  options = options || {};

  exports.run(function() {
    var logger = require('./lib/logger')(options.verbose, options.logStream);

    require('http')
      .createServer(handler)
      .listen(options.port, function() {
        logger.log({ event: 'server listening on ' + this.address().port });
      });
  }, options);
};

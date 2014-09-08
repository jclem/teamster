'use strict';

var cluster = require('cluster');
var master  = require('./lib/master');
var worker  = require('./lib/worker');

module.exports = function teamster(workerFunction, options) {
  options = options || {};

  if (cluster.isMaster) {
    master(options);
  } else {
    worker(workerFunction, options);
  }
};

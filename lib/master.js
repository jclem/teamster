'use strict';

var cluster = require('cluster');
var os      = require('os');
var util    = require('util');
var logger  = require('./logger');
var remainingWorkers = 0;

module.exports = function master(options) {
  var forks = options.numWorkers || os.cpus().length;
  var isShuttingDown;

  for (var i = 0; i < forks; i++) {
    cluster.fork();
  }

  cluster.on('fork', onFork);
  cluster.on('online', onOnline);
  cluster.on('disconnect', onDisconnect);
  cluster.on('exit', onExit);

  process.once('SIGINT', onInt);
  process.on('SIGTERM', onTerm);
  process.on('SIGQUIT', onQuit);

  function onDisconnect(worker) {
    logger.log({ event: util.format('worker %d disconnected', worker.id) });

    if (!worker.suicide) {
      cluster.fork();
    }
  }

  function onExit(worker) {
    remainingWorkers--;

    logger.log({ event: util.format('worker %d exited', worker.id) });

    if (remainingWorkers === 0) {
      logger.log({ event: 'all workers exited' });
    }
  }

  function onFork() {
    remainingWorkers++;
  }

  function onOnline(worker) {
    logger.log({ event: util.format('worker %d online', worker.id)  });
  }

  function onInt() {
    logger.log({ event: 'received INT, immediately shutting down' });
    process.kill(process.pid, 'SIGINT');
  }

  function onTerm() {
    logger.log({ event: 'forwarding TERM to QUIT' });
    process.kill(process.pid, 'SIGQUIT');
  }

  function onQuit() {
    var worker;

    if (isShuttingDown) {
      logger.log({ event: 'ignoring QUIT, already shutting down' });
      return;
    }

    logger.log({ event: 'received QUIT, attempting graceful shutdown' });

    isShuttingDown = true;

    for (var i in cluster.workers) {
      worker = cluster.workers[i];
      worker.suicide = true;
      process.kill(worker.process.pid, 'SIGQUIT');
    }
  }
};

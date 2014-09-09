'use strict';

var cluster     = require('cluster');
var fs          = require('fs');
var teamster    = require('..');
var workers     = JSON.parse(process.argv[2]);
var timeout     = JSON.parse(process.argv[3]);
var verbose     = JSON.parse(process.argv[4]);
var stopTimeout = JSON.parse(process.argv[5] || 'null');

if (cluster.isMaster) {
  cluster.on('fork', function(child) {
    process.send('fork');

    child.on('message', function(message) {
      process.send(message);
    });
  });

  cluster.on('disconnect', function(worker) {
    process.send('disconnect');
  });
}

teamster.run(function() {
  process.send('worker: ' + process.pid);

  setTimeout(function() {
    fs.appendFileSync('./test/out.txt', 'run-timeout\n');
  }, timeout);
}, {
  numWorkers: workers,
  verbose: verbose,
  timeout: stopTimeout
});

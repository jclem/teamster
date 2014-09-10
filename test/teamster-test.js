'use strict';

var fs     = require('fs');
var os     = require('os');
var spawn  = require('child_process').spawn;
var tree   = require('ps-tree');

require('./test-helper');

describe('teamster', function() {
  var testFile = 'test/run-teamster.js';
  var outFile  = 'test/out.txt';

  beforeEach(function(done) {
    unlinkOutput(done);
  });

  afterEach(function(done) {
    unlinkOutput(done);
  });

  it('runs a worker for each CPU by default', function(done) {
    setupTest({ workers: null }, function(err, contents) {
      if (err) { throw err; }

      contents.should.eql(os.cpus().reduce(function(expected) {
        return expected += 'run-timeout\n';
      }, ''));

      done();
    });
  });

  it('runs a worker with a specified number of workers', function(done) {
    setupTest({ workers: 2 }, function(err, contents) {
      if (err) { throw err; }
      contents.should.eql('run-timeout\nrun-timeout\n');
      done();
    });
  });

  describe('when receiving a SIGINT', function() {
    it('kills the master immediately', function(done) {
      var child = spawn('node', [testFile, '1', '5000']);
      child.kill('SIGINT');
      child.on('exit', done);
    });

    it('kills the children immediately', function(done) {
      setupTest({ workers: 1, timeout: 5, signal: 'SIGINT' }, function(err) {
        err.code.should.eql('ENOENT');
        done();
      });
    });
  });

  describe('when receiving a SIGTERM', function() {
    describe('and the cluster exits before the timeout', function() {
      it('gracefully shuts down', function(done) {
        setupTest({ workers: 1, signal: 'SIGTERM' }, function(err, contents) {
          if (err) { throw err; }
          contents.should.eql('run-timeout\n');
          done();
        });
      });
    });

    describe('and the cluster does not exit before the timeout', function() {
      it('kills the cluster immediately', function(done) {
        setupTest({ workers: 1, timeout: 200, stopTimeout: 5, signal: 'SIGTERM' }, function(err) {
          err.code.should.eql('ENOENT');
          done();
        });
      });
    });
  });

  describe('when receiving a SIGTTIN', function() {
    describe('when it is not shutting down', function() {
      it('forks a new worker', function(done) {
        var child = spawnChild({ workers: 1 });

        workerSpawned(child, 1, function() {
          child.kill('SIGTTIN');

          child.on('message', function(message) {
            if (message === 'fork') {
              tree(child.pid, function(err, children) {
                if (err) { throw err; }
                children.length.should.eql(2);
                child.kill();
                done();
              });
            }
          });
        });
      });
    });

    describe('when it is already shutting down', function() {
      it('does not fork a new worker', function(done) {
        var child = spawnChild({ workers: 1 });

        workerSpawned(child, 1, function() {
          child.kill('SIGTERM');
          child.kill('SIGTTIN');

          child.on('message', function(message) {
            if (message === 'fork') {
              throw new Error('Should not fork new worker');
            }
          });

          child.on('exit', function() {
            done();
          });
        });
      });
    });
  });

  describe('when receiving a SIGTTOU', function() {
    describe('when it is not shutting down', function() {
      it('shuts down a worker', function(done) {
        var child = spawnChild({ workers: 1 });

        workerSpawned(child, 1, function() {
          child.kill('SIGTTOU');

          child.on('message', function(message) {
            if (message !== 'disconnect') { return; }

            tree(child.pid, function(err, children) {
              if (err) { throw err; }
              children.length.should.eql(0);
              done();
            });
          });
        });
      });
    });

    describe('when it is already shutting down', function() {
      it('does not fork a new worker', function(done) {
        var child = spawnChild({ workers: 1 });

        workerSpawned(child, 1, function() {
          child.kill('SIGTERM');

          child.on('message', function(message) {
            if (message !== 'disconnect') { return; }

            child.kill('SIGTTOU');

            child.on('message', function(message) {
              if (message === 'disconnect') {
                throw new Error('Should not disconnect a worker');
              }
            });

            child.on('exit', function() {
              done();
            });
          });
        });
      });
    });
  });

  function setupTest(options, cb) {
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }

    options = defaultOptions(options);

    var child = spawnChild(options);

    workerSpawned(child, options.workers, function() {
      child.kill(options.signal);

      child.on('exit', function() {
        fs.readFile(outFile, function(err, contents) {
          if (err) { return cb(err); }
          cb(null, contents.toString());
        });
      });
    });
  }

  function spawnChild(options) {
    options = defaultOptions(options);

    var args = [testFile, options.workers, options.timeout, options.verbose];

    if (options.stopTimeout) {
      args.push(options.stopTimeout);
    }

    var child = spawn('node', args, { stdio: [null, null, null, 'ipc'] });

    if (options.debug) {
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stdout);
    }

    return child;
  }

  function workerSpawned(child, workers, cb) {
    var workerCount    = JSON.parse(workers) || os.cpus().length;
    var spawnedWorkers = 0;

    child.on('message', function(message) {
      if (/worker: /.test(message)) {
        spawnedWorkers++;

        if (spawnedWorkers === workerCount) {
          cb();
        }
      }
    });
  }

  function defaultOptions(options) {
    options = options || {};

    var defaults = {
      signal     : 'SIGTERM',
      stopTimeout: null,
      timeout    : null,
      verbose    : false,
      workers    : 1
    };

    for (var key in defaults) {
      if (!options.hasOwnProperty(key)) {
        options[key] = defaults[key];
      }
    }

    return options;
  }

  function unlinkOutput(done) {
    fs.unlink(outFile, function() {
      done(); // Ignore error, test/out.txt should not exist.
    });
  }
});

'use strict';

var fs     = require('fs');
var os     = require('os');
var spawn  = require('child_process').spawn;

require('should');

describe('#run', function() {
  var testFile = 'test/run-timeout.js';
  var outFile  = 'test/out.txt';

  beforeEach(function(done) {
    unlinkOutput(done);
  });

  afterEach(function(done) {
    unlinkOutput(done);
  });

  it('runs a worker for each CPU by default', function(done) {
    setupTest({ workers: 'null' }, function(err, contents) {
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
    itAttemptsAGracefulExit('SIGTERM');
  });

  describe('when receiving a SIGQUIT', function() {
    itAttemptsAGracefulExit('SIGQUIT');
  });

  function itAttemptsAGracefulExit(signal) {
    describe('and the cluster exits before the timeout', function() {
      it('gracefully shuts down', function(done) {
        setupTest({ workers: 1, signal: signal }, function(err, contents) {
          if (err) { throw err; }
          contents.should.eql('run-timeout\n');
          done();
        });
      });
    });

    describe('and the cluster does not exit before the timeout', function() {
      it('kills the cluster immediately', function(done) {
        setupTest({ workers: 1, timeout: 200, stopTimeout: 5, signal: signal }, function(err) {
          err.code.should.eql('ENOENT');
          done();
        });
      });
    });
  }

  function setupTest(options, cb) {
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }

    options         = options || {};
    options.signal  = options.signal || 'SIGTERM';
    options.timeout = options.timeout || null;
    options.verbose = options.verbose || 'false';
    options.workers = options.workers || 1;

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
    var args = [testFile, options.workers, options.timeout, options.verbose];

    if (options.stopTimeout) {
      args.push(options.stopTimeout);
    }

    return spawn('node', args, { stdio: [null, null, null, 'ipc'] });
  }

  function unlinkOutput(done) {
    fs.unlink(outFile, function() {
      done(); // Ignore error, test/out.txt should not exist.
    });
  }

  function workerSpawned(child, workers, cb) {
    var workerCount    = JSON.parse(workers) || os.cpus().length;
    var spawnedWorkers = 0;

    child.on('message', function(message) {
      if (/worker: /.test(message)) {
        spawnedWorkers++;

        if (spawnedWorkers === workerCount) {
          cb(message.split(': ')[1]);
        }
      }
    });
  }
});

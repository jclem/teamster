'use strict';

var proxy   = require('proxyquire');
var sinon   = require('sinon');
var helpers = require('./test-helper');

describe('worker', function() {
  var workerDisconnectSpy = sinon.spy();
  var logSpy = sinon.spy();

  beforeEach(function() {
    stubSetTimeout();

    process._kill = process.kill;
    process.kill = sinon.spy();
  });

  afterEach(function() {
    logSpy.reset();
    workerDisconnectSpy.reset();

    global.setTimeout = global._setTimeout;
    delete global._setTimeout;

    process.kill = process._kill;
    delete process._kill;
    helpers.removeProcessListeners();
  });

  it('calls the worker function', function() {
    var workerFunctionSpy = sinon.spy();
    runWorker(workerFunctionSpy);
    workerFunctionSpy.calledOnce.should.eql(true);
  });

  describe('when receiving SIGINT', function() {
    it('forwards another SIGINT', function() {
      runWorker(function() {});
      process.emit('SIGINT');
      process.kill.callCount.should.eql(1);
    });

    it('logs the SIGINT', function() {
      runWorker(function() {});
      process.emit('SIGINT');
      logSpy.callCount.should.eql(1);
      logSpy.calledWithExactly({
        event: 'received INT, immediately shutting down'
      }).should.eql(true);
    });
  });

  describe('when receiving SIGTERM', function() {
    it('logs the SIGTERM', function() {
      runWorker(function() {});
      process.emit('SIGTERM');
      logSpy.callCount.should.eql(1);
      logSpy.calledWithExactly({
        event: 'received TERM, waiting for master to disconnect'
      }).should.eql(true);
    });

    describe('when receiving a second SIGTERM', function() {
      it('does not log the SIGTERM', function() {
        runWorker(function() {});
        process.emit('SIGTERM');
        logSpy.reset();
        process.emit('SIGTERM');
        logSpy.callCount.should.eql(0);
      });
    });
  });

  describe('when receiving SIGQUIT', function() {
    beforeEach(function() {
      process._exit = process.exit;
    });

    afterEach(function() {
      process.exit = process._exit;
      delete process._exit;
    });

    it('disconnects the worker', function() {
      runWorker(function() {});
      process.emit('SIGQUIT');
      workerDisconnectSpy.callCount.should.eql(1);
    });

    it('logs the SIGQUIT', function() {
      runWorker(function() {});
      process.emit('SIGQUIT');
      logSpy.callCount.should.eql(1);
      logSpy.calledWithExactly({
        event: 'received QUIT, attempting graceful shutdown'
      }).should.eql(true);
    });

    describe('when the timeout option is exceeded', function() {
      itExitsAndLogsTheTimeout(20, 10);
    });

    describe('when the default timeout is exceeded', function() {
      itExitsAndLogsTheTimeout(5005);
    });

    function itExitsAndLogsTheTimeout(fnTimeout, optionTimeout) {
      beforeEach(function() {
        global.setTimeout = global._setTimeout;
      });

      afterEach(function() {
        stubSetTimeout();
      });

      it('exits the process with an error status', function(done) {
        runTimeoutWorker();
        process.emit('SIGQUIT');

        process.exit = function(code) {
          code.should.eql(1);
          done();
        };
      });

      it('logs the timeout', function(done) {
        runTimeoutWorker();
        process.emit('SIGQUIT');

        process.exit = function() {
          logSpy.calledWithExactly({
            event: 'shutdown timeout exceeded, forcing shutdown'
          }).should.eql(true);

          done();
        };
      });

      function runTimeoutWorker() {
        runWorker(function() {
          setTimeout(function() {}, fnTimeout);
        }, { timeout: optionTimeout, disableTimeout: false });
      }
    }
  });

  function runWorker(fn, options) {
    options = options || {};

    proxy('../lib/worker', {
      './logger': function() {
        return {
          log: logSpy
        };
      },

      cluster: {
        worker: {
          disconnect: workerDisconnectSpy
        }
      }
    })(fn, options);
  }

  function stubSetTimeout() {
    global._setTimeout = global.setTimeout;

    global.setTimeout = function() {
      return global._setTimeout(function() {
      }, 0);
    };
  }
});

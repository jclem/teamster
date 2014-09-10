'use strict';

var EventEmitter = require('events').EventEmitter;
var proxy        = require('proxyquire');
var sinon        = require('sinon');
var through      = require('through');
var util         = require('util');
var helpers      = require('./test-helper');

describe('master', function() {
  var disconnectSpy, logs, master, mockCluster, stream;

  beforeEach(function() {
    logs = [];
    mockCluster = createMockCluster();

    stream = through(function write(data) {
      logs.push(data);
    }, function end() {
      this.queue(null);
    });
  });

  afterEach(function() {
    helpers.removeProcessListeners();
  });

  describe('when forking workers', function() {
    beforeEach(function() {
      master = proxy('../lib/master', {
        cluster: mockCluster
      });
    });

    describe('when not given a number of workers', function() {
      it('forks workers according to CPU count', function() {
        master({ verbose: false });
        mockCluster.fork.callCount.should.eql(require('os').cpus().length);
      });
    });

    describe('when given a numWorkers option', function() {
      it('forks the numWorkers', function() {
        master({ verbose: false, numWorkers: 2 });
        mockCluster.fork.callCount.should.eql(2);
      });
    });
  });

  describe('when a worker disconnects', function() {
    beforeEach(function() {
      proxy('../lib/master', {
        cluster: mockCluster
      })({ verbose: true, logStream: stream, numWorkers: 1 });
    });

    it('logs the disconnect', function() {
      mockCluster.emit('disconnect', { suicide: true, id: 1 });

      logs.should.eql([
        util.format('source=teamster:master pid=%d event="worker 1 disconnected"\n', process.pid)
      ]);
    });

    describe('and the worker\'s suicide property is true', function() {
      it('does not fork a new worker', function() {
        mockCluster.emit('disconnect', { suicide: true, id: 1 });
        mockCluster.fork.callCount.should.eql(1);
      });
    });

    describe('and the worker\'s suicide property is not true', function() {
      it('forks a new worker', function() {
        mockCluster.emit('disconnect', { suicide: false, id: 1 });
        mockCluster.fork.callCount.should.eql(2);
      });
    });
  });

  describe('when a worker exits', function() {
    beforeEach(function() {
      proxy('../lib/master', {
        cluster: mockCluster
      })({ verbose: true, logStream: stream, numWorkers: 1 });

      mockCluster.emit('fork'); // Simulate forks to increment remainingWorkers
      mockCluster.emit('fork');
      mockCluster.emit('exit', { suicide: true, id: 1 });
      mockCluster.emit('exit', { suicide: true, id: 1 });
    });

    it('logs the exit', function() {
      logs[0].should.eql(
        util.format('source=teamster:master pid=%d event="worker 1 exited"\n', process.pid)
      );
    });

    describe('when all workers have exited', function() {
      it('logs that all workers have exited', function() {
        logs[2].should.eql(
          util.format('source=teamster:master pid=%d event="all workers exited"\n', process.pid)
        );
      });
    });
  });

  describe('when a worker comes online', function() {
    it('logs the online event', function() {
      proxy('../lib/master', {
        cluster: mockCluster
      })({ verbose: true, logStream: stream, numWorkers: 1 });

      mockCluster.emit('online', { id: 1 });

      logs.should.eql([
        util.format('source=teamster:master pid=%d event="worker 1 online"\n', process.pid)
      ]);
    });
  });

  describe('signal handling', function() {
    var kill;

    beforeEach(function() {
      kill = sinon.stub(process, 'kill');

      proxy('../lib/master', {
        cluster: mockCluster
      })({ verbose: true, logStream: stream, numWorkers: 1 });
    });

    afterEach(function() {
      process.kill.restore();
    });

    describe('when receiving a SIGINT', function() {
      beforeEach(function() {
        process.emit('SIGINT');
      });

      it('logs the SIGINT', function() {
        logs.should.eql([
          util.format('source=teamster:master pid=%d event="received INT, immediately shutting down"\n', process.pid)
        ]);
      });

      it('kills the process with a SIGINT', function() {
        kill.callCount.should.eql(1);
        kill.calledWithExactly(process.pid, 'SIGINT').should.eql(true);
      });
    });

    describe('when receiving a SIGTERM', function() {
      describe('if it is not already shutting down', function() {
        beforeEach(function() {
          process.emit('SIGTERM');
        });

        it('logs the TERM event', function() {
          logs.should.eql([
            util.format('source=teamster:master pid=%d event="received TERM, attempting graceful shutdown"\n', process.pid)
          ]);
        });

        it('kills the workers', function() {
          kill.args.should.eql([
            [mockCluster.workers[1].process.pid, 'SIGTERM']
          ]);
        });
      });

      describe('if it is already shutting down', function() {
        beforeEach(function() {
          process.emit('SIGTERM');
          process.kill.restore();
          kill = sinon.stub(process, 'kill');
          process.emit('SIGTERM');
        });

        it('logs the TERM ignore', function() {
          logs[1].should.eql(
            util.format('source=teamster:master pid=%d event="ignoring TERM, already shutting down"\n', process.pid)
          );
        });

        it('ignores the TERM', function() {
          kill.callCount.should.eql(0);
        });
      });
    });

    describe('when receiving a TTIN', function() {
      describe('when it is not shutting down', function() {
        beforeEach(function() {
          mockCluster.fork.reset();
          process.emit('SIGTTIN');
        });

        it('logs the TTIN', function() {
          logs.should.eql([
            util.format('source=teamster:master pid=%d event="received TTIN, forking additional worker"\n', process.pid)
          ]);
        });

        it('forks an additional worker', function() {
          mockCluster.fork.callCount.should.eql(1);
        });
      });

      describe('when it is already shutting down', function() {
        beforeEach(function() {
          mockCluster.fork.reset();
          process.emit('SIGTERM');
          process.emit('SIGTTIN');
        });

        it('logs the ignored TTIN', function() {
          logs[1].should.eql(
            util.format('source=teamster:master pid=%d event="ignoring TTIN, am shutting down"\n', process.pid)
          );
        });

        it('does not fork an additional worker', function() {
          mockCluster.fork.callCount.should.eql(0);
        });
      });
    });

    describe('when receiving a TTOU', function() {
      describe('when it is not shutting down', function() {
        beforeEach(function() {
          mockCluster.fork.reset();
          process.emit('SIGTTOU');
        });

        it('logs the TTOU', function() {
          logs.should.eql([
            util.format('source=teamster:master pid=%d event="received TTOU, disconnecting a worker"\n', process.pid)
          ]);
        });

        it('disconnects a worker', function() {
          kill.args.should.eql([
            [mockCluster.workers[1].process.pid, 'SIGTERM']
          ]);
        });

        describe('and there are no more workers to disconnect', function() {
          beforeEach(function() {
            mockCluster.workers = {};
            process.emit('SIGTTOU');
          });

          it('logs the ignored TTOU', function() {
            logs[1].should.eql(
              util.format('source=teamster:master pid=%d event="ignoring TTOU, all workers disconnected"\n', process.pid)
            );
          });

          it('does not disconnect a worker', function() {
            disconnectSpy.callCount.should.eql(0);
          });
        });
      });

      describe('when it is already shutting down', function() {
        beforeEach(function() {
          mockCluster.fork.reset();
          process.emit('SIGTERM');
          process.emit('SIGTTOU');
        });

        it('logs the ignored TTOU', function() {
          logs[1].should.eql(
            util.format('source=teamster:master pid=%d event="ignoring TTOU, am shutting down"\n', process.pid)
          );
        });

        it('does not disconnect a worker', function() {
          disconnectSpy.callCount.should.eql(0);
        });
      });
    });
  });

  function createMockCluster() {
    var mock = new EventEmitter();
    mock.fork = sinon.spy();
    disconnectSpy = sinon.spy();

    mock.workers = {
      1: {
        process: { pid: 10 },
        disconnect: disconnectSpy
      }
    };

    return mock;
  }
});

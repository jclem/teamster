'use strict';

var cluster = require('cluster');
var proxy   = require('proxyquire');
var sinon   = require('sinon');

require('./test-helper');

describe('#run', function() {
  var index, masterSpy, runSpy, workerSpy;

  beforeEach(function() {
    runSpy    = sinon.spy();
    masterSpy = sinon.spy();
    workerSpy = sinon.spy();

    index = proxy('..', {
      './lib/master': masterSpy,
      './lib/worker': workerSpy
    });
  });

  describe('when in a master process', function() {
    it('calls master', function() {
      index.run(runSpy, { verbose: true });

      masterSpy.args.should.eql([
        [{ verbose: true }]
      ]);
    });
  });

  describe('when in a worker process', function() {
    it('calls worker', function() {
      cluster.isMaster = false;
      index.run(runSpy, { verbose: true });
      cluster.isMaster = true;

      workerSpy.args.should.eql([
        [runSpy, { verbose: true }]
      ]);
    });
  });
});

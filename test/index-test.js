'use strict';

var cluster = require('cluster');
var proxy   = require('proxyquire');
var sinon   = require('sinon');

require('./test-helper');

describe('#run', function() {
  var index, masterStub, runSpy, workerStub;

  beforeEach(function() {
    runSpy     = sinon.spy();
    masterStub = sinon.stub().returns('masterStubValue');
    workerStub = sinon.stub().returns('workerStubValue');

    index = proxy('..', {
      './lib/master': masterStub,
      './lib/worker': workerStub
    });
  });

  describe('when in a master process', function() {
    it('calls master', function() {
      index.run(runSpy, { verbose: true });

      masterStub.args.should.eql([
        [{ verbose: true }]
      ]);
    });

    it('returns master', function() {
      index.run(runSpy, { verbose: true }).should.eql('masterStubValue');
    });
  });

  describe('when in a worker process', function() {
    beforeEach(function() {
      cluster.isMaster = false;
    });

    afterEach(function() {
      cluster.isMaster = true;
    });

    it('calls worker', function() {
      index.run(runSpy, { verbose: true });

      workerStub.args.should.eql([
        [runSpy, { verbose: true }]
      ]);
    });

    it('returns worker', function() {
      index.run(runSpy, { verbose: true }).should.eql('workerStubValue');
    });
  });
});

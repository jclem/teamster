'use strict';

var cluster = require('cluster');
var through = require('through');
var util    = require('util');

require('should');

describe('logger', function() {
  var logs, stream;

  beforeEach(function() {
    logs = [];

    stream = through(function write(data) {
      logs.push(data);
    }, function end() {
      this.queue(null);
    });
  });

  describe('when verbose is false', function() {
    it('does not log', function() {
      require('../lib/logger')(false, stream).log({ foo: 'bar' });
      logs.should.eql([]);
    });
  });

  describe('when verbose is true', function() {
    describe('when in the worker cluster', function() {
      it('logs a worker-namespaced message', function() {
        cluster.isMaster = false;
        require('../lib/logger')(true, stream).log({ foo: 'bar' });
        cluster.isMaster = true;

        logs.should.eql([
          util.format('source=teamster:worker pid=%d foo=bar\n', process.pid)
        ]);
      });
    });

    describe('when in the master cluster', function() {
      it('logs a master-namespaced message', function() {
        require('../lib/logger')(true, stream).log({ foo: 'bar' });

        logs.should.eql([
          util.format('source=teamster:master pid=%d foo=bar\n', process.pid)
        ]);
      });
    });
  });
});

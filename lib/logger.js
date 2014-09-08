'use strict';

var cluster = require('cluster')
var source;

if (cluster.isMaster) {
  source = 'teamster:master';
} else {
  source = 'teamster:worker';
}

module.exports = require('logfmt').namespace({
  source: source,
  pid   : process.pid
});

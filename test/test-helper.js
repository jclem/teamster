'use strict';

require('should');

exports.removeProcessListeners = function() {
  [
    'SIGINT',
    'SIGTERM',
    'SIGTTIN',
    'SIGTTOU'
  ].forEach(function(event) {
    process.removeAllListeners(event);
  });
};

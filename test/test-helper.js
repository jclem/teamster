'use strict';

require('should');

exports.removeProcessListeners = function() {
  [
    'SIGINT',
    'SIGTERM',
    'SIGQUIT',
    'SIGTTIN',
    'SIGTTOU'
  ].forEach(function(event) {
    process.removeAllListeners(event);
  });
};

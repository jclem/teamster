# teamster [![Build Status](https://travis-ci.org/jclem/teamster.svg?branch=master)](https://travis-ci.org/jclem/teamster)  [![Code Climate](https://codeclimate.com/github/jclem/teamster/badges/gpa.svg)](https://codeclimate.com/github/jclem/teamster) [![Test Coverage](https://codeclimate.com/github/jclem/teamster/badges/coverage.svg)](https://codeclimate.com/github/jclem/teamster)

> **The twelve-factor app's [processes][processes] are *disposable*, meaning
> they can be started or stopped at a moment's notice.** This facilitates fast
> elastic scaling, rapid deployment of [code][code] or [config][config]
> changes, and robustness of production deploys.

*— [The Twelve-Factor App][twelve-factor]*

Teamster is a Twelve-Factor-compliant, Unix-y worker process manager for Node.
Its primary use is to facilitate the painless running and graceful shutdown of
HTTP servers, but it has many other potential use cases.

Clusters running with teamster listen for the Unix signal `SIGTERM`, and then
attempt to shut down their worker processes gracefully. This is useful in both
single-worker and multiple-worker situations, as in both cases it's desirable
for an HTTP server to finish serving any requests in progress before exiting.

When a teamster master process receives the `SIGTERM` signal, it tells all of
the worker processes to stop accepting new connections, serve their requests
already in progress, and then exit.

## Usage

### Run a function

Teamster can run a single function for you in a worker or workers. Simply pass
`#run` a function as the first argument.

```javascript
require('teamster').run(function() {
  console.log('I am a worker!');
}, options);
```

### Run an HTTP server

Although you could easily do this with `#run`, teamster can also run an HTTP
server for you with `#runServer`. The first argument to `#runServer`
should be a function with the standard Node request handler signature, which
includes Express apps.

```javascript
require('teamster').runServer(function(req, res) {
  res.end('I am served from a worker!');
}, options);
```

Note that `#runServer` will either run on a `port` specified in the optional
`options` object argument, or any available port.

### Options

Both `#run` and `#runServer` accept an optional second `options` argument.

| Option       | Type            | Default     | Description                                                                               | `#run` | `#runServer` |
| ------------ | --------------- | ----------- | ----------------------------                                                              | ------ | ------------ |
| `verbose`    | boolean         | `true`      | Whether or not to include verbose logging of fork/disconnect/exit events                  |   ✓    |      ✓       |
| `numWorkers` | number          | # cpus      | The number of workers to fork                                                             |   ✓    |      ✓       |
| `timeout`    | number          | `5000`      | The number of seconds to wait after attempting graceful shutdown to forcibly kill workers |   ✓    |      ✓       |
| `port`       | number, string  | `undefined` | The port that the server should listen on                                                 |        |      ✓       |

## Signals

Teamster works by responding to [Unix signals][unix_signals]. Typically, you'll
only want to send signals to teamster's master process, and it will forward
signals onto the worker processes as appropriate.

| Signal    | Trap all or once?       | Effect                                                                                                                                                                                                 |
| --------- | ----------------------- | ----------------------------                                                                                                                                                                           |
| `SIGTERM` | all                     | Ignore and forward `SIGQUIT`                                                                                                                                                                           |
| `SIGQUIT` | all                     | If not already shutting down, begin to attempt a graceful shutdown of all workers. If a worker does not shut down after `timeout`, the worker is killed immediately. If already shutting down, ignore. |
| `SIGINT`  | once                    | Log the signal and then forward it again, which will immmediately kill the master and all worker processes.                                                                                            |
| `SIGTTIN` | all                     | Fork an additional worker unless shutting down.                                                                                                                                                        |
| `SIGTTOU` | all                     | Disconnect a worker unless shutting down. When the number of workers reaches 0, the master process will exit.                                                                                          |

## Caveat

Node is very fast, and it's unlikely that you need to be run a process for each
CPU. It's more likely you'll have unused workers and unnecessarily high memory
usage, unless you've done testing and are sure you'll benefit from running more
than a single worker process. Even with a single worker, however, teamster is
useful, as it will take care of graceful worker shutdowns for you.

[unix_signals]: http://en.wikipedia.org/wiki/Unix_signal
[processes]: http://12factor.net/processes
[code]: http://12factor.net/codebase
[config]: http://12factor.net/config
[twelve-factor]: http://12factor.net/disposability

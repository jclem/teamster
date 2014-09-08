# teamster

Unix-y cluster manager

## Usage

### Run a function

Teamster can run a single function for you in a forking model. Simply pass
`#run` a function as your first argument.

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
| `port`       | number, string  | `undefined` | The port that the server should bind to                                                   |        |      ✓       |

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

[unix_signals]: http://en.wikipedia.org/wiki/Unix_signal

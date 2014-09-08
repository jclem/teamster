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

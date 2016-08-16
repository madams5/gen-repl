# gen-repl (v1.0.0)

Gen-repl is a nodejs REPL (read-eval-print loop) that supports yield and yield\* from the command line.

* combined with Q (or your favorite promise library): no callbacks required
* supports blocks via `.startblock` or `.sb` and `.endblock` or `.eb` (repl won't properly handle blocks when a custom eval function is defined?)
* `.help` - lists all of the typical nodejs repl commands
* `<ctrl>-C` - aborts processing of the current expression or block
* `<ctrl>-D` - has the same effect as the `.exit` command 

### Todo

* allow npm imports from inside the repl



Pull requests for any issues always welcome.

### Examples

```
> let Q = require('q');
undefined
> .startblock
... function sleep (ms) {
...     console.log('sleeping ', ms);
...     let deferred = Q.defer();
...     setTimeout(function () {
...         deferred.resolve();
...     }, ms);
...     return deferred.promise;
... }
... .endblock
undefined
> console.log('starting'); yield sleep(5000); console.log('done');
starting
sleeping 5000
<<< 5 second gap >>>
done
undefined
>
>
>
> .sb
... function* gSleep (ms) {
...    let deferred = Q.defer();
...    setTimeout(function () {
...        deferred.resolve();
...    }, ms);
...    yield deferred.promise;
... }
... .eb
undefined
> console.log('starting'); yield* gSleep(5000); console.log('done');
starting
<<< 5 second gap >>>
done
undefined
> 
```

### Sql Example

`npm install mysqljs/mysql lodash`

`node app`

```
> let mysql = require('mysql');
undefined
> let connection = mysql.createConnection('mysql://root:password@localhost/mysql');
undefined
> connection.qConnect = Q.nfbind(connection.connect.bind(connection));
[Function]
> yield connection.qConnect();
OkPacket {
  fieldCount: 0,
  affectedRows: 0,
  insertId: 0,
  serverStatus: 2,
  warningCount: 0,
  message: '',
  protocol41: true,
  changedRows: 0 }
> connection.qQuery = Q.nfbind(connection.query.bind(connection));
[Function]
> let users = yield connection.qQuery('select * from user');
undefined
> let l = require('lodash'); // can't use _ here since it's reserved (is the last result)
undefined
> l.map(users[0], 'Host'); // users result is an array of 2 arrays: [ [rows], [fields] ]
[ 'localhost',
  'vagrant-ubuntu-trusty-64',
  '127.0.0.1',
  '::1',
  'localhost' ]
>
```

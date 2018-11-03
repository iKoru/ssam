//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
const http = require('http');
const path = require('path');

const async = require('async');
const express = require('express');

const {Pool, types} = require('pg');
const config = require('./config');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
const compression = require('compression');

const app = express();
const router = require('./server/router');


//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
app.use(logger(process.env.NODE_ENV));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(compression());
app.use(express.static(path.resolve(__dirname, 'client')));

router(app);//take over to router

var TIMESTAMPTZ_OID = 1184
var TIMESTAMP_OID = 1114

//types.setTypeParser(TIMESTAMPTZ_OID, val => val === null? null : moment(val.substring(0, val.length-3)));
//types.setTypeParser(TIMESTAMP_OID, val => val === null? null : moment(val.substring(0, val.length-3)));
//types.setTypeParser(TIMESTAMPTZ_OID, val => val === null? null : new Date(val.substring(0, val.length-3)));
//types.setTypeParser(TIMESTAMP_OID, val => val === null? null : new Date(val.substring(0, val.length-3)));
//types.setTypeParser(TIMESTAMP_OID, val => val);
//types.setTypeParser(TIMESTAMPTZ_OID, val => val);

const pool = new Pool(config.dbOptions);
pool.query('show timezone', (err, res)=>{
  console.log("postgres db connection test");
  console.log(err, res);
})
pool.query('select localtimestamp', (err, res)=>{
  console.log("postgres db connection test");
  console.log(err, res);
  console.log(res.rows[0].now);
  pool.end();
})
app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = app.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});

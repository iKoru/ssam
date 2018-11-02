//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

var jwt = require('jsonwebtoken');
var {Pool, types} = require('pg');
var config = require('./config');
var moment = require('moment');
//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
router.use(require('body-parser').json());
var messages = [];
var sockets = [];
router.post('/signin', function(req, res){
  let userId = req.body.userId;
  let password = req.body.password;
  if(userId === 'test' || password === 'xptmxm1!'){
    res.json(jwt.sign({userId:userId}, config.jwtKey, config.jwtOptions));
  }else{
    res.status(400).json({message:'잘못된 접근입니다.'});
  }
});

router.get('/user', function(req, res){
  let token = req.headers['x-auth'];
  let user = jwt.verify(token, config.jwtKey, config.jwtOptions);
  if(user){
    res.json({status: "NORMAL", ...user});
  }else{
    res.status(400);
  }
});
io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

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
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});

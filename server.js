"use strict";

const app = require('./app');
let server;
if (process.env.IS_LOCAL) {
  const fs = require('fs')
  server = require("https").createServer({ key: fs.readFileSync('../../key.pem'), cert: fs.readFileSync('../../cert.pem') }, app);
} else {
  server = require('http').Server(app);
}

server.listen(process.env.PORT || 8080, process.env.IP || "0.0.0.0", function () {
  const addr = server.address();
  console.log("ssam server listening at", addr.address + ":" + addr.port);
});
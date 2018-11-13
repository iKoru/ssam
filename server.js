"use strict";

const app = require('./app');
const server = require("http").Server(app);

server.listen(process.env.PORT || 8080, process.env.IP || "0.0.0.0", function () {
    const addr = server.address();
    console.log("ssam server listening at", addr.address + ":" + addr.port);
});
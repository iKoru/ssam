"use strict";

const path = require('path');
const express = require('express');

const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
const compression = require('compression');

const app = express();
const server = require("http").Server(app);

const router = require('./server/router');

process.env.NODE_ENV = (process.env.NODE_ENV && (process.env.NODE_ENV).trim().toLowerCase() == 'production') ? 'production' : 'development';

app.use(logger(process.env.NODE_ENV));
app.use('/static', express.static(path.resolve(__dirname, 'client')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression());

router(app); //take over to router

server.listen(process.env.PORT || 8080, process.env.IP || "0.0.0.0", function () {
    const addr = server.address();
    console.log("ssam server listening at", addr.address + ":" + addr.port);
});
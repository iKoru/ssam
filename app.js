const path = require('path');
const express = require('express');

const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('./server/logger');
const compression = require('compression');


const app = express()

const router = require('./server/router');

process.env.NODE_ENV = (process.env.NODE_ENV && (process.env.NODE_ENV).trim().toLowerCase() == 'production') ? 'production' : 'development';
logger.info('SSAM SERVER IS RUNNING IN ' + process.env.NODE_ENV + ' ENVIRONMENT!!')
    //app.use(logger(process.env.NODE_ENV));
app.use('/static', express.static(path.resolve(__dirname, 'client')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression());

router(app); //take over to router

module.exports = app;
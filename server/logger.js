'use strict';

const
    winston = require('winston'),
    fs = require('fs'),
    util = require('util');

//logging setting
const logDirectory = 'logs';
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

const { createLogger, format } = winston;
const { combine, timestamp, printf } = format;

const myFormat = printf(info => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
});

const logger = createLogger({
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        new (require('winston-daily-rotate-file'))({
            filename: `${logDirectory}/ssam.log`,
            timestamp: timestamp,
        })
    ]
});

const formatArgs = function (args) {
    return [util.format.apply(util.format, Array.prototype.slice.call(Array.from(args).map(x => x instanceof Error ? x.stack : (typeof x === 'object' ? JSON.stringify(x) : x))))];
}
module.exports = {
    log: function () {
        logger.info(formatArgs(arguments));
    },
    info: function () {
        logger.info(formatArgs(arguments));
    },
    warn: function () {
        logger.warn(formatArgs(arguments));
    },
    error: function () {
        logger.error(formatArgs(arguments));
    }
};
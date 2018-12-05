const path = require('path'),
    express = require('express');
require('express-async-errors');//error handling
const cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    compression = require('compression'),
    cors = require('cors'),
    helmet = require('helmet'),
    csrf = require('csurf');
const logger = require('./server/logger');

require('./server/scheduler');
require('./server/cache').flushAll();

const app = express()

const router = require('./server/router');

process.env.NODE_ENV = (process.env.NODE_ENV && (process.env.NODE_ENV).trim().toLowerCase() == 'production') ? 'production' : 'development';
logger.info('SSAM SERVER IS RUNNING IN ' + process.env.NODE_ENV + ' ENVIRONMENT!!')
    //app.use(logger(process.env.NODE_ENV));
app.use(cors());
app.use(helmet());
//app.use(csrf());
app.use('/static', express.static(path.resolve(__dirname, 'client')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression());

router(app); //take over to router
//at last, take error to error handler
app.use((err, req, res, next) => {
    logger.error('예상하지 못한 에러!! : ', err, req.route, req.userObject);
    res.status(500).json({message:'예상하지 못한 에러입니다. 관리자에게 문의 부탁드립니다.'})
});
module.exports = app;
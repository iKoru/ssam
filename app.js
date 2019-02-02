const path = require('path'),
    express = require('express');
require('express-async-errors');//error handling
const cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    compression = require('compression'),
    cors = require('cors'),
    helmet = require('helmet');
const logger = require('./server/logger');

require('./server/scheduler');
require('./server/cache').flushAll();

const app = express()

process.env.NODE_ENV = (process.env.NODE_ENV && (process.env.NODE_ENV).trim().toLowerCase() == 'production') ? 'production' : 'development';
logger.info('SSAM SERVER IS RUNNING IN ' + process.env.NODE_ENV + ' ENVIRONMENT!!')

app.use(cors({ origin: process.env.NODE_ENV === 'development' ? true : [process.env.ADMIN_DOMAIN, process.env.CLIENT_DOMAIN], credentials: true }));
app.use(helmet.frameguard({action: 'allow-from', domain: process.env.CLIENT_DOMAIN + ', '+ process.env.ADMIN_DOMAIN}));
app.use(helmet());
app.disable('x-powered-by');
app.use('/static', express.static(path.resolve(__dirname, 'client')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression());

require('./server/router')(app); //take over to router
//at last, take error to error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN'){
    // handle CSRF token errors here
    res.status(403).json({message:'세션이 만료되었습니다. 다시 로그인해주시기 바랍니다.'})
    console.log(req.cookies);
    return;
  }
  
  logger.error('예상하지 못한 에러!! : ', err, req.route, req.userObject);
  res.status(500).json({ message: '예상하지 못한 에러입니다. 관리자에게 문의 부탁드립니다.' })
});
module.exports = app;
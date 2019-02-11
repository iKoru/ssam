const jwt = require('jsonwebtoken'),
    connect = require('connect'),
    csrf = require('csurf');
const config = require('../../config.js'),
    qs = require('querystring'),
    logger = require('../logger'),
    { jwtErrorMessages } = require('../constants'),
    userModel = require('../models/userModel');

const auth = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        logger.info('signin trial without token')
        if (req.method === 'GET' || req.method === 'DELETE') {
            return res.status(401).json({ redirectTo: `/signin?${qs.stringify({ method: req.method, redirectTo: req.path, ...req.query })}`, message: '로그인이 필요합니다.' });
        } else {
            return res.status(401).json({ redirectTo: `/signin?${qs.stringify({ method: req.method, redirectTo: req.path, ...req.body })}`, message: '로그인이 필요합니다.' });
        }
    }

    const p = new Promise((resolve, reject) => {
        jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
            if (err) {
                if (err.message === 'jwt expired') {
                    err.statusCode = 401;
                }
                reject(err);
                return;
            }
            resolve(result);
        });
    })

    const onError = (error) => {
        logger.info('signin trial failed')
        res.status(error.statusCode || 403).json({
            message: `잘못된 접근입니다.[${jwtErrorMessages[error.message] || error.message}]`
        })
    }
    p.then(async (result) => {
        req.userObject = (await userModel.getUser(result.userId))[0];
        if (req.userObject && req.userObject.isAdmin) {
            logger.info('signin trial success')
            next();
        } else {
            logger.info('signin trial failed due to not found user id');
            if(req.path === '/admin'){
                return res.clearCookie('token').status(403).json({ message: '잘못된 접근입니다.' });
            }else{
                return res.status(403).json({ message: '잘못된 접근입니다.' });
            }
        }
    }).catch(onError)
}
const token = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Headers', 'set-cookie');
  res.cookie('CSRF-TOKEN', req.csrfToken(), {secure:true, httpOnly:false});
  next();
}

const combine = (function() {
  var chain = connect();
  [csrf({cookie:{secure:true, httpOnly:false}}), token, auth].forEach(function(middleware) {
    chain.use(middleware);
  });
  return chain;
})();
module.exports = combine;
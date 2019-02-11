const jwt = require('jsonwebtoken'),
  connect = require('connect'),
  csrf = require('csurf');
const config = require('../../config'),
  qs = require('querystring'),
  { jwtErrorMessages } = require('../constants'),
  logger = require('../logger');
const userModel = require('../models/userModel')
const auth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
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
        return reject(err);
      }
      return resolve(result);
    });
  })

  const onError = (error) => {
    res.status(error.statusCode || 403).json({
      message: `잘못된 접근입니다.[${jwtErrorMessages[error.message] || error.message}]`,
      redirectTo: error.redirectTo
    })
  }
  p.then(async (result) => {
    if (result.userId) {
      let auth = await userModel.checkUserAuth(result.userId),
        user = await userModel.getUser(result.userId);
      if (Array.isArray(auth)) {
        if ((!auth.some(x => x.groupType === 'D') && auth.some(x => x.groupType === 'A')) || (Array.isArray(user) && user.length > 0 && user[0].isAdmin)) {
          req.userObject = user[0];
          req.userObject.auth = 'A';
          next();
        } else {
          onError({ message: '인증이 필요합니다.', statusCode: 403, redirectTo: '/error?error=403' });
        }
      } else {
        logger.error('인증 체크 중 에러 : ', user, result.userId)
        onError({ message: `인증 정보를 불러올 수 없습니다.[${user.code || ''}]`, statusCode: 403 });
      }
    } else {
      onError({ message: '비정상적인 접근', statusCode: 401 });
    }
  }).catch(onError)
}
const token = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Headers', 'set-cookie');
  res.cookie('CSRF-TOKEN', req.csrfToken(), {secure:true, httpOnly:false, domain:process.env.NODE_ENV === 'production'?'.pedagy.com':undefined});
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
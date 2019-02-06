const jwt = require('jsonwebtoken'),
  jwt_decode = require('jwt-decode'),
  bcrypt = require('bcryptjs');
const config = require('../../config'),
  { jwtErrorMessages } = require('../constants');
const router = require('express').Router();
const visitorOnly = require('../middlewares/visitorOnly'),
  adminOnly = require('../middlewares/adminOnly');
const signModel = require('../models/signModel'),
  userModel = require('../models/userModel'),
  util = require('../util'),
  mailer = require('../mailer'),
  logger = require('../logger');

//based on /

router.post('/signin', visitorOnly('/'), async (req, res) => {
  let userId = req.body.userId;
  let password = req.body.password;
  if (!userId || !password) {
    return res.status(400).json({ message: '아이디와 비밀번호를 모두 입력해주세요.' });
  } else {
    const user = await userModel.getUser(userId);
    if (!Array.isArray(user) || user.length === 0) {
      return res.status(404).json({ target: 'userId', message: '존재하지 않는 아이디입니다.' });
    } else if (user.length > 1) {
      logger.error('로그인 중 중복아이디 에러 : ', user);
      return res.status(500).json({ message: '서버 데이터 오류입니다. 관리자에게 문의 부탁드립니다.' });
    } else {
      if (user[0].status === 'DELETED') {
        signModel.createSigninLog(userId, user[0].lastSigninDate, req.ip, false);
        return res.status(404).json({ target: 'userId', message: '존재하지 않는 아이디입니다.' });
      } else if (await bcrypt.compare(password, user[0].password)) {
        if (user[0].status !== 'NORMAL') {
          signModel.createSigninLog(userId, user[0].lastSigninDate, req.ip, false);
          return res.status(403).json({ target: 'userId', message: '이용이 불가능한 아이디입니다.' });
        }
        const auth = await userModel.checkUserAuth(userId);
        if (!Array.isArray(auth)) {
          logger.error('로그인 시도 중 권한 그룹 조회 실패 에러 : ', auth, userId);
          return res.status(500).json({ message: `로그인에 실패하였습니다.[${auth.code || ''}]` })
        }
        if (auth.length > 0 && auth.some(x => x.groupType === 'D')) {//인증 불가 그룹
          signModel.createSigninLog(userId, user[0].lastSigninDate, req.ip, false);
          return res.status(403).json({ target: 'userId', message: '이용이 불가능한 아이디입니다.' });
        }

        jwt.sign({ userId: userId }, config.jwtKey, { expiresIn: (req.body.rememberMe ? "7d" : "3h"), ...config.jwtOptions }, (err, token) => {
          if (err) {
            signModel.createSigninLog(userId, user[0].lastSigninDate, req.ip, false);
            logger.error('로그인 진행 중 에러 : ', err, userId)
            return res.status(500).json({ message: '로그인에 실패하였습니다.', ...err });
          } else {
            signModel.createSigninLog(userId, user[0].lastSigninDate, req.ip, true);
            const today = util.moment();
            if (auth.some(x => x.groupType === 'A' && (x.expireDate === '99991231' || util.moment(x.expireDate, 'YYYYMMDD').add(-1, 'months').isAfter(today))) || auth.some(x => x.groupType === 'E') && !user[0].emailVerifiedDate) {//인증 그룹이 존재하고, 인증 만료기간이 1달 이상 남은 인증그룹도 존재하거나, 전직교사로서 영구적으로 인증하지 않겠다고 선택한 경우(emailVerifiedDate가 없는 경우)
              return res.cookie('token', token, { secure: true }).json({ userId: userId });
            }
            return res.cookie('token', token, { secure: true }).json({ userId: userId, redirectTo: '/auth', imminent: auth.some(x => x.groupType === 'A' && util.moment(x.expireDate, 'YYYYMMDD').isAfter(today) && util.moment(x.expireDate, 'YYYYMMDD').add(-1, "months").isBefore(today)), needEmail: !user[0].email });//인증 내역이 없거나 인증 만료 기간이 임박한 경우
          }
        })
      } else {
        signModel.createSigninLog(userId, user[0].lastSigninDate, req.ip, false);
        return res.status(400).json({ target: 'password', message: '비밀번호가 일치하지 않습니다.' });
      }
    }
  }
});

router.post('/resetPassword', visitorOnly('/'), async (req, res) => {
  let userId = req.body.userId;
  let email = req.body.email;
  if (!userId) {
    return res.status(400).json({ target: 'userId', message: '아이디를 입력해주세요.' });
  } else {
    const user = await userModel.getUser(userId);
    if (!Array.isArray(user) || user.length === 0) {
      return res.status(404).json({ target: 'userId', message: '존재하지 않는 아이디입니다.' });
    } else if (user.length > 1) {
      logger.error('패스워드 리셋 중 중복아이디 에러 : ', user);
      return res.status(500).json({ message: '서버 데이터 오류입니다. 관리자에게 문의 부탁드립니다.' });
    } else if (!email && !user[0].email) {
      //등록된 이메일이 없는 경우
      return res.statusCode(400).json({ target: 'email', message: '등록된 이메일이 없어 패스워드를 초기화하지 못했습니다. 관리자에게 직접 문의해주세요.' })
    } else if (user[0].email === email) {
      let newPassword = util.partialUUID() + util.partialUUID();
      const result = await userModel.updateUserPassword({
        userId: userId,
        password: await bcrypt.hash(newPassword, config.bcryptSalt)
      });
      if (typeof result !== 'number' || result === 0) {
        logger.error('새로운 리셋 패스워드 저장 에러 : ', user, result);
        return res.status(500).json({ message: '새로운 패스워드를 저장하는 데 실패하였습니다. 관리자에게 문의 부탁드립니다.' });
      } else {
        if (await mailer.sendTempPasswordEmail(email, newPassword)) {
          return res.status(200).json({ message: '새로운 패스워드를 이메일로 발송하였습니다. 메일을 확인해주세요!' });
        } else {
          return res.status(500).json({ message: '이메일을 발송하지 못했습니다. 잠시 후 다시 시도해주세요.' });
        }
      }
    } else {
      return res.status(400).json({ target: 'email', message: 'ID에 등록된 이메일과 다릅니다.' });
    }
  }
});

router.post('/refresh', (req, res) => {
  const token = req.cookies.token;
  if (token) {
    jwt.verify(token, config.jwtKey, config.jwtOptions, async (err, result) => {
      if (!err) { //아직 유효한 토큰이면 그대로 보낸다.
        const user = await userModel.getUser(result.userId);
        if (!Array.isArray(user) || user.length === 0) {
          return res.status(400).json({ message: '잘못된 접근입니다.' });
        } else {
          if (user[0].status !== 'NORMAL') {
            return res.status(400).json({ message: '잘못된 접근입니다.' });
          }
          const auth = await userModel.checkUserAuth(result.userId);
          if (Array.isArray(auth) && auth.length > 0) {
            if (auth.some(x => x.groupType === 'D')) {//영구 인증 불가 그룹
              return res.status(400).json({ message: '잘못된 접근입니다.' });
            }
          }
          const today = util.moment();
          if (auth.some(x => x.groupType === 'A' && (x.expireDate === '99991231' || util.moment(x.expireDate, 'YYYYMMDD').add(-1, 'months').isAfter(today))) || auth.some(x => x.groupType === 'E') && !user[0].emailVerifiedDate) {//인증 그룹이 존재하고, 인증 만료기간이 1달 이상 남은 인증그룹도 존재하거나, 전직교사로서 영구적으로 인증하지 않겠다고 선택한 경우(emailVerifiedDate가 없는 경우)
            return res.cookie('token', token, { secure: true }).json({ userId: result.userId });
          }
          return res.cookie('token', token, { secure: true }).json({ userId: result.userId, redirectTo: '/auth', imminent: auth.some(x => x.groupType === 'A' && util.moment(x.expireDate, 'YYYYMMDD').isAfter(today) && util.moment(x.expireDate, 'YYYYMMDD').add(-1, "months").isBefore(today)), needEmail: !user[0].email });//인증 내역이 없거나 인증 만료 기간이 임박한 경우
        }
      } else if (err.name === 'TokenExpiredError') { //token is valid except it's expired
        if ((new Date(err.expiredAt).getTime() + 3600000) >= (new Date().getTime())) { //기한 만료 및 만료시간부터 1시간이 지나지 않았다면 토큰 리프레시
          const decoded = jwt_decode(token);
          if (decoded.userId) {
            const user = await userModel.getUser(decoded.userId);
            if (!Array.isArray(user) || user.length === 0) {
              return res.status(400).json({ message: '잘못된 접근입니다.' });
            } else {
              if (user[0].status !== 'NORMAL') {
                return res.status(400).json({ message: '잘못된 접근입니다.' });
              }
              const auth = await userModel.checkUserAuth(decoded.userId);
              if (Array.isArray(auth) && auth.length > 0) {
                if (auth.some(x => x.groupType === 'D')) {//영구 인증 불가 그룹
                  return res.status(400).json({ message: '잘못된 접근입니다.' });
                }
              }
              jwt.sign({ userId: decoded.userId }, config.jwtKey, { expiresIn: (decoded.exp - decoded.iat), ...config.jwtOptions }, (err, token) => {
                if (err) {
                  return res.status(500).json({ message: '로그인 연장에 실패하였습니다.' });
                } else {
                  const today = util.moment()
                  if (auth.some(x => x.groupType === 'A' && (x.expireDate === '99991231' || util.moment(x.expireDate, 'YYYYMMDD').add(-1, 'months').isAfter(today))) || auth.some(x => x.groupType === 'E') && !user[0].emailVerifiedDate) {//인증 그룹이 존재하고, 인증 만료기간이 1달 이상 남은 인증그룹도 존재하거나, 전직교사로서 영구적으로 인증하지 않겠다고 선택한 경우(emailVerifiedDate가 없는 경우)
                    return res.cookie('token', token, { secure: true }).json({ userId: decoded.userId });
                  }
                  return res.cookie('token', token, { secure: true }).json({ userId: decoded.userId, redirectTo: '/auth', imminent: auth.some(x => x.groupType === 'A' && util.moment(x.expireDate, 'YYYYMMDD').isAfter(today) && util.moment(x.expireDate, 'YYYYMMDD').add(-1, "months").isBefore(today)), needEmail: !user[0].email });//인증 내역이 없거나 인증 만료 기간이 임박한 경우
                }
              })
            }
          } else {
            return res.status(400).json({ message: '잘못된 접근입니다.' });
          }
        } else {
          return res.status(400).json({ message: '세션이 만료되었습니다.' });
        }
      } else { //기한만료가 아닌 기타 오류는 갱신 대상 아님
        return res.status(400).json({ message: jwtErrorMessages[err.message] || '유효하지 않은 접근입니다.' });
      }
    });
  } else {
    return res.status(400).json({ message: '로그인 정보가 없습니다.' });
  }
});

router.get('/admin', adminOnly, async (req, res) => {
  let result = await userModel.getProfile(req.userObject.loungeNickName);
  if (Object.keys(result).length === 0) {
    return res.status(404).json({ target: 'nickName', message: '사용자를 찾을 수 없습니다.' })
  } else if (result[0].userId) {
    delete result[0].userId;
    return res.status(200).json(result[0]);
  } else {
    logger.error('프로필 조회 중 에러 : ', result, req.userObject.loungeNickName);
    return res.status(500).json({ message: `프로필을 조회하지 못했습니다.[${result.code || ''}]` })
  }
})

router.get('/check', adminOnly, async (req, res) => {
  return res.status(200).end();
});
module.exports = router;
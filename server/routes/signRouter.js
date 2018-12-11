const jwt = require('jsonwebtoken'),
    jwt_decode = require('jwt-decode'),
    bcrypt = require('bcrypt');
const config = require('../../config');
const router = require('express').Router();
const visitorOnly = require('../middlewares/visitorOnly'),
    adminOnly = require('../middlewares/adminOnly');
const signModel = require('../models/signModel'),
    userModel = require('../models/userModel'),
    util = require('../util'),
    logger = require('../logger');

//based on /
/*router.get('/signin', visitorOnly('/'), (req, res) => {
    res.status(501).end();
});*/

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
                if (user[0].status !== 'NORMAL' && user[0].status !== 'AUTHORIZED') {
                    signModel.createSigninLog(userId, user[0].lastSigninDate, req.ip, false);
                    return res.status(403).json({ target: 'userId', message: '이용이 불가능한 아이디입니다.' });
                }
                const auth = await userModel.checkUserAuth(userId);
                if (Array.isArray(auth) && auth.length > 0) {
                    if (auth.some(x => x.type === 'AUTH_DENIED')) {//영구 인증 불가 그룹
                        signModel.createSigninLog(userId, user[0].lastSigninDate, req.ip, false);
                        return res.status(403).json({ target: 'userId', message: '이용이 불가능한 아이디입니다.' });
                    }
                }

                jwt.sign({ userId: userId }, config.jwtKey, { expiresIn: (req.body.rememberMe ? "7d" : "3h"), ...config.jwtOptions }, (err, token) => {
                    if (err) {
                        signModel.createSigninLog(userId, user[0].lastSigninDate, req.ip, false);
                        logger.error('로그인 진행 중 에러 : ', err, userId)
                        return res.status(500).json({ message: '로그인에 실패하였습니다.', ...err });
                    } else {
                        signModel.createSigninLog(userId, user[0].lastSigninDate, req.ip, true);
                        if (Array.isArray(auth) && auth.length > 0) {
                            if (auth.some(x => x.type === 'AUTH_GRANTED')) {//영구 인증 그룹
                                return res.json({ token: token });
                            }
                        } else if (user[0].status === 'NORMAL' || util.moment(user[0].emailVerifiedDate, 'YYYYMMDD').add(11, 'months').isBefore(util.moment())) {
                            return res.json({ token: token, redirectTo: '/auth' });
                        }
                        return res.json({ token: token });
                    }
                })
            } else {
                signModel.createSigninLog(userId, user[0].lastSigninDate, req.ip, false);
                return res.status(400).json({ target: 'password', message: '비밀번호가 일치하지 않습니다.' });
            }
        }
    }
});

/*router.get('/signup', visitorOnly('/'), (req, res) => { //회원가입 페이지 접근
    res.status(501).end();
});

router.get('/resetPassword', visitorOnly('/'), (req, res) => {
    res.status(501).end();
});*/

router.post('/resetPassword', visitorOnly('/'), async (req, res) => {
    let userId = req.body.userId;
    let email = req.body.email;
    if (!userId) {
        return res.status(400).json({ target: 'userId', message: '아이디를 입력해주세요.' });
    } else {
        const user = await userModel.getUser(userId);
        if (!Array.isArray(user) || user.length === 0) {
            return res.status(404).json({ message: '존재하지 않는 아이디입니다.' });
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
                //send email
                return res.status(200).json({ message: '새로운 패스워드를 이메일로 발송하였습니다. 메일을 확인해주세요!' });
            }
        } else {
            return res.status(400).json({ message: '이메일이 일치하지 않습니다.' });
        }
    }
});

router.post('/refresh', (req, res) => {
    const token = req.headers['x-auth'];
    if (token) {
        jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
            if (!err) { //아직 유효한 토큰이면 그대로 보낸다.
                return res.status(200).json({ token: token });
            } else if (err.name === 'TokenExpiredError') { //token is valid except it's expired
                if ((new Date(err.expiredAt).getTime() + 3600000) >= (new Date().getTime())) { //기한 만료 및 만료시간부터 1시간이 지나지 않았다면 토큰 리프레시
                    const decoded = jwt_decode(token);
                    if (decoded.userId) {
                        jwt.sign({ userId: decoded.userId }, config.jwtKey, { expiresIn: (decoded.exp - decoded.iat), ...config.jwtOptions }, (err, token) => {
                            if (err) {
                                return res.status(500).json({ message: '로그인 연장에 실패하였습니다.' });
                            } else {
                                return res.status(200).json({ token: token });
                            }
                        })
                    } else {
                        return res.status(400).json({ message: '잘못된 접근입니다.' });
                    }
                } else {
                    return res.status(400).json({ message: '세션이 만료되었습니다.' });
                }
            } else { //기한만료가 아닌 기타 오류는 갱신 대상 아님
                return res.status(400).json({ message: '유효하지 않은 접근입니다.' });
            }
        });
    } else {
        return res.status(400).json({ message: '로그인 정보가 없습니다.' });
    }
});

router.get('/admin', adminOnly, async (req, res) => {
    let result = await userModel.getProfile(req.userObject.loungeNickName);
    if (result.userId) {
        delete result.userId;
        return res.status(200).json(result);
    } else if (Object.keys(result).length === 0) {
        return res.status(404).json({ target: 'nickName', message: '사용자를 찾을 수 없습니다.' })
    } else {
        logger.error('프로필 조회 중 에러 : ', result, req.userObject.loungeNickName);
        return res.status(500).json({ message: `프로필을 조회하지 못했습니다.[${result.code || ''}]` })
    }
})

router.get('/check', adminOnly, async (req, res) => {
    return res.status(200).end();
});
module.exports = router;
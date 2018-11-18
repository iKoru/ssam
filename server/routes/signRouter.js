const jwt = require('jsonwebtoken'),
    jwt_decode = require('jwt-decode'),
    bcrypt = require('bcrypt');
const config = require('../../config');
const router = require('express').Router();
const visitorOnly = require('../middlewares/visitorOnly');
const signModel = require('../models/signModel'),
    userModel = require('../models/userModel'),
    util = require('../util');

//based on /
router.get('/signin', visitorOnly('/'), (req, res) => {
    res.status(501).end();
});

router.post('/signin', async (req, res) => {
    let userId = req.body.userId;
    let password = req.body.password;
    if (!userId || !password) {
        res.status(400).json({ message: '아이디와 비밀번호를 모두 입력해주세요.' });
        return;
    } else {
        const user = await userModel.getUser(userId);
        if (!user || user.length < 1) {
            res.status(404).json({ target: 'userId', message: '존재하지 않는 아이디입니다.' });
            return;
        } else if (user.length > 1) {
            res.status(500).json({ message: '서버 데이터 오류입니다. 관리자에게 문의 부탁드립니다.' });
            return;
        } else {
            if (user[0].status === 'DELETED') {
                res.status(404).json({ target: 'userId', message: '존재하지 않는 아이디입니다.' });
                return;
            } else if (user[0].status !== 'NORMAL' && user[0].status !== 'AUTHORIZED') {
                res.status(403).json({ target: 'userId', message: '이용이 불가능한 아이디입니다.' });
                return;
            } else if (await bcrypt.compare(password, user[0].password)) {
                res.json(jwt.sign({ userId: userId }, config.jwtKey, { expiresIn: (req.body.rememberMe ? "7d" : "3h"), ...config.jwtOptions }));
                return;
            } else {
                res.status(400).json({ target: 'password', message: '비밀번호가 일치하지 않습니다.' });
                return;
            }
        }
    }
});

router.get('/signup', visitorOnly('/'), (req, res) => { //회원가입 페이지 접근
    res.status(501).end();
});

router.get('/resetPassword', visitorOnly('/'), (req, res) => {
    res.status(501).end();
});

router.post('/resetPassword', visitorOnly('/'), async (req, res) => {
    let userId = req.body.userId;
    let email = req.body.userId;
    if (!userId || !email) {
        res.status(400).json({ message: '잘못된 접근입니다.' });
    } else {
        const user = await userModel.getUser(userId);
        if (!user || user.length < 1) {
            res.status(404).json({ message: '존재하지 않는 아이디입니다.' });
        } else if (user.length > 1) {
            res.status(500).json({ message: '서버 데이터 오류입니다. 관리자에게 문의 부탁드립니다.' });
        } else if (user[0].email === email) {
            let newPassword = util.partialUUID() + util.partialUUID();
            const hash = await bcrypt.hash(newPassword, 10);
            const result = await userModel.updateUserPassword({
                userId: userId,
                password: hash
            });
            if (result !== 1) {
                res.status(500).json({ message: '새로운 패스워드를 저장하는 데 실패하였습니다. 관리자에게 문의 부탁드립니다.' });
            } else {
                //send email
                res.status(200).json({ message: '새로운 패스워드를 이메일로 발송하였습니다. 메일을 확인해주세요!' });
            }
        } else {
            res.status(400).json({ message: '이메일이 일치하지 않습니다.' });
        }
    }
});

router.post('/refresh', (req, res) => {
    const token = req.headers['x-auth'];
    jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
        if (!err) { //아직 유효한 토큰이면 그대로 보낸다.
            res.status(200).json(token);
        } else if (err.name === 'TokenExpiredError') { //token is valid except it's expired
            if ((new Date(err.expiredAt).getTime() + 3600000) >= (new Date().getTime())) { //기한 만료 및 만료시간부터 1시간이 지나지 않았다면 토큰 리프레시
                const decoded = jwt_decode(token);
                if (decoded.userId) {
                    res.json(jwt.sign({ userId: decoded.userId }, config.jwtKey, { expiresIn: (decoded.exp - decoded.iat), ...config.jwtOptions }));
                } else {
                    res.status(400).json({ message: '잘못된 접근입니다.' });
                }
            } else {
                res.status(400).end();
            }
        } else { //기한만료가 아닌 기타 오류는 갱신 대상 아님
            res.status(400).end();
        }
    });
});
module.exports = router;
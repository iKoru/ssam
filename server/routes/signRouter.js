const jwt = require('jsonwebtoken'),
    jwt_decode = require('jwt-decode');
const config = require('../../config');
const router = require('express').Router();
const auth = require('../middlewares/auth');
module.exports = function() {

    router.get('/user', auth, function(req, res) {
        if (req.userObject) {
            res.json({ status: "NORMAL", ...req.userObject });
        } else {
            res.status(400).end();
        }
    });

    router.post('/signin', function(req, res) {
        let userId = req.body.userId;
        let password = req.body.password;
        if (userId === 'test' || password === 'xptmxm1!') {
            res.json(jwt.sign({ userId: userId }, config.jwtKey, { expiresIn: (req.body.rememberMe ? "7d" : "3h"), ...config.jwtOptions }));
        } else {
            res.status(400).json({ message: '잘못된 접근입니다.' });
        }
    });

    router.post('/refresh', function(req, res) {
        const token = req.headers['x-auth'];
        jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
            if (err && err.name === 'TokenExpiredError') { //token is valid except it's expired
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
            } else if (!err) { //아직 유효한 토큰이면 그대로 보낸다.
                res.json(token);
            } else { //기한만료가 아닌 기타 오류는 갱신 대상 아님
                res.status(400).end();
            }
        });
    });

    return router;
}
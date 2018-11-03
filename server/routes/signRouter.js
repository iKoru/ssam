const jwt = require('jsonwebtoken');
const config = require('../../config');
const router = require('express').Router();
const auth = require('../middlewares/auth');
module.exports = function() {

    router.get('/user', auth, function(req, res) {
        if (req.userObject) {
            res.json({ status: "NORMAL", ...req.userObject });
        } else {
            res.status(400);
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

    return router;
}
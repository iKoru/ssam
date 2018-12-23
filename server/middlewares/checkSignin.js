const jwt = require('jsonwebtoken');
const config = require('../../config.js');
const logger = require('../logger');
const userModel = require('../models/userModel')

const auth = (req, res, next) => {
    const token = req.headers['x-auth'];
    if (!token) {
        next();
        return;
    }

    const p = new Promise((resolve, reject) => {
        jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    })

    const onError = (error) => {
        logger.error('로그인 에러(checkSignin) : ', error.message);
        next();
    }
    p.then(async (result) => {
        if (result.userId) {
            let user = await userModel.getUser(result.userId);
            if (user && user[0]) {
                req.userObject = user[0];
                next();
            } else {
                onError({ message: '존재하지 않는 ID입니다.' });
                return;
            }
        } else {
            onError({ message: '비정상적인 접근입니다.' });
            return;
        }
    }).catch(onError)
}

module.exports = auth;
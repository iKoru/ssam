const jwt = require('jsonwebtoken');
const config = require('../../config.js');
const qs = require('querystring'),
    logger = require('../logger'),
    { jwtErrorMessages } = require('../constants');
const userModel = require('../models/userModel')

const auth = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        if (req.method === 'GET' || req.method === 'DELETE') {
            return res.status(401).json({ redirectTo: `/signin${qs.stringify({ method: req.method, redirectTo: req.path, ...req.query })}`, message: '로그인이 필요합니다.' });
        } else {
            return res.status(401).json({ redirectTo: `/signin${qs.stringify({ method: req.method, redirectTo: req.path, ...req.body })}`, message: '로그인이 필요합니다.' });
        }
    }

    const p = new Promise((resolve, reject) => {
        jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
            if (err) {
                if (err.message === 'jwt expired') {
                    err.status = 401;
                }
                reject(err);
                return;
            }
            resolve(result);
        });
    })

    const onError = (error) => {
        logger.error('로그인 에러 : ', error.message);
        return res.status(error.status || 403).json({
            message: `잘못된 접근입니다.[${jwtErrorMessages[error.message] || error.message}]`
        })
    }
    p.then(async (result) => {
        if (result.userId) {
            let user = await userModel.getUser(result.userId);
            if (user && user[0]) {
                req.userObject = user[0];
                const statusAuth = await userModel.checkUserAuth(result.userId)
                if(Array.isArray(statusAuth)){
                    if(statusAuth.some(x=>x.groupType === 'D')){
                        req.userObject.auth = 'D'//인증 제한
                    }else if(statusAuth.some(x=>x.groupType === 'A')){
                        req.userObject.auth = 'A'//인증
                    }else if(statusAuth.some(x=>x.groupType === 'E')){
                        req.userObject.auth = 'E'//인증 만료
                    }else{
                        req.userObject.auth = 'N'//미인증
                    }
                }else{
                    logger.error('사용자 인증정보 가져오는 도중 에러(requiredSignin): ', statusAuth, result.userId)
                    req.userObject.auth = 'N'//미인증
                }
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
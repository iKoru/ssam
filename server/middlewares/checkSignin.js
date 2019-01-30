const jwt = require('jsonwebtoken');
const config = require('../../config.js');
const logger = require('../logger');
const userModel = require('../models/userModel')

const auth = (req, res, next) => {
    const token = req.cookies.token;
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
        logger.warn('로그인 정보 없음(checkSignin) : ', error.message);
        next();
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
                    logger.error('사용자 인증정보 가져오는 도중 에러(checkSignin): ', statusAuth, result.userId)
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
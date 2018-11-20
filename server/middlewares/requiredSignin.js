const jwt = require('jsonwebtoken');
const config = require('../../config.js');
const util = require('../util'),
logger = require('../logger');
const userModel = require('../models/userModel')

const auth = (req, res, next) => {
    const token = req.headers['x-auth'];
    if (!token) {
        if (req.method === 'GET' || req.method === 'DELETE') {
            return res.status(403).json({ redirectTo: `/signin${util.objectToQuerystring({ method: req.method, path: req.path, ...req.query })}`, message: '로그인이 필요합니다.' });
        } else {
            return res.status(403).json({ redirectTo: '/signin', message: '로그인이 필요합니다.' });
        }
    }

    const p = new Promise((resolve, reject) => {
        jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
            if (err){
                reject(err);
                return;
            } 
            resolve(result);
        });
    })

    const onError = (error) => {
        logger.error('로그인 에러 : ', error.message);
        return res.status(403).json({
            message: `잘못된 접근입니다.[${error.message}]`
        })
        
    }
    p.then(async (result) => {
        if (result.userId) {
            let user = await userModel.getUser(result.userId);
            if (user && user[0]) {
                req.userObject = user[0];
                next();
            }else{
                onError({message:'존재하지 않는 ID입니다.'});
                return;
            }
        }else{
            onError({message:'비정상적인 접근입니다.'});
            return;
        }
    }).catch(onError)
}

module.exports = auth;
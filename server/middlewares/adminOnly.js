const jwt = require('jsonwebtoken');
const config = require('../../config.js'),
    util = require('../util'),
    logger = require('../logger'),
    userModel = require('../models/userModel');

const auth = (req, res, next) => {
    const token = req.headers['x-auth'];
    if (!token) {
        logger.info('signin trial without token')
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
        logger.info('signin trial failed')
        res.status(403).json({
            message: `잘못된 접근입니다.[${error.message}]`
        })
    }
    p.then(async(result) => {
        req.userObject = (await userModel.getUser(result.userId))[0];
        if (req.userObject && req.userObject.isAdmin) {
            logger.info('signin trial success')
            next();
        } else {
            logger.info('signin trial failed due to not found user id')
            return res.status(403).json({ message: '잘못된 접근입니다.' });
        }
    }).catch(onError)
}

module.exports = auth;
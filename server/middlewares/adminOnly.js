const jwt = require('jsonwebtoken');
const config = require('../../config.js'),
util = require('../util'),
    userModel = require('../models/userModel');

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
            if (err) reject(err);
            resolve(result);
        });
    })

    const onError = (error) => {
        res.status(403).json({
            message: `잘못된 접근입니다.[${error.message}]`
        })
    }
    p.then(async(result) => {
        req.userObject = (await userModel.getUser(result.userId))[0];
        if (req.userObject && req.userObject.isAdmin) {
            next();
        } else {
            return res.status(403).json({ message: '잘못된 접근입니다.' });
        }
    }).catch(onError)
}

module.exports = auth;
const jwt = require('jsonwebtoken');
const config = require('../../config.js');
const util = require('../util');

const auth = (req, res, next) => {
    const token = req.headers['x-auth'];
    console.log("token : ", token);
    if (!token) {
        if (req.method === 'GET' || req.method === 'DELETE') {
            return res.redirect(307, `/signin${util.objectToQuerystring({ method: req.method, path: req.path, ...req.query })}`);
        } else {
            return res.redirect(307, '/signin');
        }
    }

    const p = new Promise((resolve, reject) => {
        jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
            if (err) reject(err)
            resolve(result);
        });
    })

    const onError = (error) => {
        res.status(403).json({
            status: false,
            message: `잘못된 접근입니다.[${error.message}]`
        })
    }
    p.then((result) => {
        req.userObject = result;
        next();
    }).catch(onError)
}

module.exports = auth;
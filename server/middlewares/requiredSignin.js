const jwt = require('jsonwebtoken');
const config = require('../../config.js');

const auth = (req, res, next) => {
    const token = req.headers['x-auth'];
    if(!token){
        return res.status(403).json({
           status: false,
           message: '로그인이 필요합니다.'
        });
    }
    
    const p = new Promise((resolve, reject) => {
        jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
           if(err) reject(err)
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
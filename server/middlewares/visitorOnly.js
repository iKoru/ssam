const jwt = require('jsonwebtoken');
const config = require('../../config.js');

module.exports = (redirectPath) => {
    return (req, res, next) => {
        const token = req.headers['x-auth'];
        if (token) {
            new Promise((resolve, reject) => {
                jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
                    if (err) reject(err)
                    resolve(result);
                });
            }).then((result) => {
                res.redirect(redirectPath);
            }).catch((e) => {
                next();
            })
        }
        next();
    };
}

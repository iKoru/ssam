const jwt = require('jsonwebtoken');
const config = require('../../config.js');

module.exports = (redirectPath) => {
    return (req, res, next) => {
        const token = req.cookies.token;
        if (token) {
            new Promise((resolve, reject) => {
                jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
                    if (err) {
                        reject(err)
                        return;
                    }
                    return resolve(result);
                });
            }).then((result) => {
                if (redirectPath) {
                    return res.redirect(307, process.env.CLIENT_DOMAIN + redirectPath);
                } else {
                    return res.status(400).end();
                }
            }).catch((e) => {
                next();
            })
        }else{
            next();
        }
    };
}

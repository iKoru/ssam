const jwt = require('jsonwebtoken');
const config = require('../../config.js');

module.exports = (redirectPath) => {
    return (req, res, next) => {
        const token = req.headers['x-auth'];
        if (token) {
            new Promise((resolve, reject) => {
                jwt.verify(token, config.jwtKey, config.jwtOptions, (err, result) => {
                    if (err){
                        reject(err)
                        return;
                    } 
                    resolve(result);
                });
            }).then((result) => {
                if (redirectPath) {
                    res.redirect(307, redirectPath);
                } else {
                    res.status(400).end();
                }
            }).catch((e) => {
                next();
            })
        }
        next();
    };
}

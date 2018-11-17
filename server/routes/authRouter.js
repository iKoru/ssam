const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
const authModel = require('../models/authModel'),
    util = require('../util');
//based on /auth
router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.post('/', requiredSignin, (req, res) => {
    let userId = req.userObject.userId;
    let email = req.userObject.email;
    let authKey;
    let history = await authModel.getUserAuth(userId, true);
    if (history && history.length > 0) {
        authKey = history[0].authKey;
        authModel.updateUserAuth({
            userId: userId,
            authKey: authKey,
            sendDateTime: true
        })
    } else {
        authKey = util.UUID();
        authModel.createUserAuth(userId, authKey);
    }
    //send email

    res.status(501).end();
});

router.get('/submit', async(req, res) => { // get /auth/submit 
    if (!req.query.userId || !req.query.authKey) {
        res.status(404).json({ message: '잘못된 접근입니다.' }); //TODO : show failed page
    } else {
        let userId = req.query.userId,
            authKey = req.query.authKey;
        let history = await authModel.getUserAuth(userId, true);
        if (history && history.length > 0) {
            let i = 0;
            while (i < history.length) {
                if (history[i].authKey === authKey) {
                    authModel.updateUserAuth({
                        userId: userId,
                        authKey: authKey,
                        status: 'DONE'
                    })
                    if (userModel.updateUserAuth(userId) === 1) {
                        res.status(200).json({ message: '정상적으로 인증되었습니다!' }); //TODO : show success page
                    } else {
                        res.status(500).json({ message: '인증사항을 저장하는 데 실패하였습니다. 관리자에게 문의해주세요.' }); //TODO : show failed page
                    }
                }
                i++;
            }
        }
        res.status(404).json({ message: '잘못된 접근입니다.' }); //TODO : show failed page
    }
});

module.exports = router;
const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
const authModel = require('../models/authModel'),
    userModel = require('../models/userModel'),
    util = require('../util');
//based on /auth
router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.post('/', requiredSignin, async(req, res) => {
    if (req.userObject.status === 'AUTHORIZED' && req.userObject.emailVerifiedDate && util.moment(req.userObject.emailVerifiedDate, 'YYYYMMDD').add(11, 'months').isAfter(util.moment())) {
        return res.status(403).json({ message: '이미 인증을 받으셨습니다.' });
    }
    let userId = req.userObject.userId;
    let email = req.userObject.email;
    let authKey;
    let result = await authModel.getUserAuth(userId, 'NORMAL');
    if (Array.isArray(result) && result.length > 0) {
        authKey = result[0].authKey;
        result = await authModel.updateUserAuth({
            userId: userId,
            authKey: authKey,
            sendDateTime: true
        })
    } else {
        authKey = util.UUID();
        result = await authModel.createUserAuth(userId, authKey);
    }
    //TODO : send email(async)
    if (typeof result === 'number' && result > 0) {
        return res.status(200).json({ message: '등록된 이메일로 인증메일을 보내드렸습니다. 이메일을 확인해주세요.' });
    } else {
        return res.status(500).json({ message: `인증 메일을 생성하는 도중에 오류가 발생했습니다.[${result.code}]` })
    }

});

router.get('/submit', async(req, res) => { // get /auth/submit 
    if (!req.query.userId || !req.query.authKey) {
        return res.status(400).json({ message: '잘못된 접근입니다.' }); //TODO : show failed page
    } else {
        let userId = req.query.userId,
            authKey = req.query.authKey;
        const user = await userModel.getUser(userId);
        if (!Array.isArray(user) || user.length < 1) {
            return res.status(404).json({ message: '잘못된 접근입니다.' });
        } else if (user[0].status !== 'NORMAL') {
            return res.status(400).json({ message: '이미 인증되어있거나, 인증을 진행할 수 없는 상태입니다. 관리자에게 문의해주세요.' });
        }
        let history = await authModel.getUserAuth(userId, 'NORMAL');
        if (history && history.length > 0) {
            let i = 0;
            while (i < history.length) {
                if (history[i].authKey === authKey) {
                    authModel.updateUserAuth({
                        userId: userId,
                        authKey: authKey,
                        status: 'DONE'
                    })
                    if (await userModel.updateUserAuth(userId) === 1 && await userModel.updateUserInfo({ userId: userId, status: 'AUTHORIZED' }) === 1) {
                        return res.status(200).json({ message: '정상적으로 인증되었습니다!' }); //TODO : show success page
                    } else {
                        return res.status(500).json({ message: '인증사항을 저장하는 데 실패하였습니다. 관리자에게 문의해주세요.' }); //TODO : show failed page
                    }
                }
                i++;
            }
        }
        return res.status(400).json({ message: '인증 기간이 만료되었습니다. 인증 이메일을 다시 요청해주세요.' }); //TODO : show failed page
    }
});

module.exports = router;
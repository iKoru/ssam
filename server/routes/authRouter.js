const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
const authModel = require('../models/authModel'),
    userModel = require('../models/userModel'),
    groupModel = require('../models/groupModel'),
    util = require('../util'),
    logger = require('../logger'),
    mailer = require('../mailer'),
    { dbErrorCode } = require('../constants'),
    { authGrantedGroupId, authExpiredGroupId } = require('../../config');
//based on /auth
router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.post('/', requiredSignin, async (req, res) => {
    let result = await userModel.checkUserAuth(req.userObject.userId);
    if (!Array.isArray(result)) {
        logger.error('인증 이메일 생성 도중 에러 : ', result, req.userObject.userId)
        return res.status(500).json({ message: `인증 도중 오류가 발생하였습니다.[${result.code || ''}]` })
    }
    const today = util.moment();
    if (result.some(x => x.groupType === 'A' && (x.expireDate === '99991231' || util.moment(x.expireDate, 'YYYYMMDD').add(-1, 'months').isAfter(today))) && req.userObject.emailVerifiedDate && util.moment(req.userObject.emailVerifiedDate, 'YYYYMMDD').add(11, 'months').isAfter(util.moment())) {
        return res.status(403).json({ message: '이미 인증을 받으셨습니다.' });
    }
    let userId = req.userObject.userId;
    let email = req.userObject.email;
    let authKey;
    if(!email){
        return res.status(400).json({message:'등록된 이메일이 없습니다.', target:'email'});
    }
    result = await authModel.getUserAuth(userId, 'NORMAL');
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
    if (result === 1 && await mailer.sendEmailVerification(userId, email, authKey)) {
        return res.status(200).json({ message: '등록된 이메일로 인증메일을 보내드렸습니다. 이메일을 확인해주세요.' });
    } else {
        logger.error('인증메일 보내기 요청 처리 중 에러 : ', result, req.userObject.userId, req.userObject.email)
        return res.status(500).json({ message: `인증 메일을 생성하는 도중에 오류가 발생했습니다.[${result.code || ''}]` })
    }
});

router.post('/submit', async (req, res) => { // post /auth/submit 
    if (!req.body.userId || !req.body.authKey) {
        return res.status(400).json({ message: '인증할 사용자를 찾을 수 없습니다.' });
    } else {
        let userId = req.body.userId,
            authKey = req.body.authKey;
        const user = await userModel.getUser(userId);
        if (!Array.isArray(user) || user.length < 1) {
            return res.status(404).json({ message: '인증할 사용자를 찾을 수 없습니다.' });
        } else if (user[0].status !== 'NORMAL') {
            return res.status(400).json({ message: '이미 인증되어있거나, 인증을 진행할 수 없는 상태입니다. 관리자에게 문의해주세요.' });
        }
        let history = await authModel.getUserAuth(userId, 'NORMAL');
        if (history && history.length > 0) {
            let i = 0;
            while (i < history.length) {
                if (history[i].authKey === authKey) {//found matched key
                    authModel.updateUserAuth({
                        userId: userId,
                        authKey: authKey,
                        status: 'DONE'
                    })
                    history = await userModel.updateUserAuth(userId);
                    if (history === 1) {
                        await groupModel.deleteUserGroup(userId, authExpiredGroupId);
                        await groupModel.deleteUserGroup(userId, authGrantedGroupId);
                        history = await groupModel.createUserGroup(userId, authGrantedGroupId);
                        if (history === 1 || history.code === dbErrorCode.PKDUPLICATION) {
                            return res.status(200).json({ message: '정상적으로 인증되었습니다.' });
                        }
                    }
                    logger.error('인증메일 응답으로 인증 처리 중 에러 : ', req.body.userId, req.body.authKey, history)
                    return res.status(500).json({ message: '인증사항을 저장하는 데 실패하였습니다. 관리자에게 문의해주세요.' });
                }
                i++;
            }
        }
        return res.status(400).json({ message: '인증 기간이 만료되었습니다. 인증 이메일을 다시 요청해주세요.' });
    }
});

module.exports = router;
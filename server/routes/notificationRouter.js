const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin'),
    adminOnly = require('../middlewares/adminOnly'),
    logger = require('../logger'),
    { moment } = require('../util');
const notificationModel = require('../models/notificationModel'),
    userModel = require('../models/userModel');
//based on /notification

router.get('/', requiredSignin, async (req, res) => {
    let type = req.query.type;
    if (typeof type !== 'string' || type.length > 2) {
        type = undefined;
    }
    let dateTimeBefore = req.query.dateTimeBefore;
    if (typeof dateTimeBefore !== 'string' || !moment(dateTimeBefore, 'YYYYMMDDHH24MISS').isValid()) {
        dateTimeBefore = undefined;
    }

    let result = await notificationModel.getNotifications(req.userObject.userId, dateTimeBefore, type)
    if (Array.isArray(result)) {
        result.forEach(x => {
            x.message = x.template.replace(/\$1/gi, x.variable1);
            x.message = x.message.replace(/\$2/gi, x.variable2);
            x.message = x.message.replace(/\$3/gi, x.variable3);
            x.message = x.message.replace(/\$4/gi, x.variable4);
            delete x.template;
            delete x.variable1;
            delete x.variable2;
            delete x.variable3;
            delete x.variable4;
            delete x.type;
            delete x.target;
        })
        return res.status(200).json(result);
    } else {
        logger.error('알림 내용 조회 중 에러 : ', result, type, dateTimeBefore, req.userObject.userId)
        return res.status(500).json({ message: `알림 내용을 가져오지 못했습니다.[${result.code || ''}]` });
    }
});

router.put('/', requiredSignin, async (req, res) => {
    let clearNotification = req.body.clearNotification, result;
    if (clearNotification !== undefined && clearNotification === true) {
        result = await notificationModel.clearNotification(req.userObject.userId);
    } else {
        let notification = {
            notificationId: req.body.notificationId,
            isRead: req.body.isRead,
            template: req.body.template,
            variable1: req.body.variable1,
            variable2: req.body.variable2,
            variable3: req.body.variable3,
            variable4: req.body.variable4,
            href: req.body.href
        }
        if (typeof notification.notificationId === 'string') {
            notification.notificationId = 1 * notification.notificationId;
        }
        if (!Number.isInteger(notification.notificationId) || notification.notificationId === 0) {
            return res.status(400).json({ target: 'notificationId', message: '변경할 알림을 찾을 수 없습니다.' })
        }
        if (notification.isRead !== undefined && typeof notification.isRead !== 'boolean') {
            return res.status(400).json({ target: 'isRead', message: '조회여부 값이 올바르지 않습니다.' })
        }
        if (!req.userObject.isAdmin) {
            if (notification.isRead === undefined) {
                return res.status(400).json({ message: '변경할 내역이 없습니다.' });
            }
            delete notification.template;
            delete notification.variable1;
            delete notification.variable2;
            delete notification.variable3;
            delete notification.variable4;
            delete notification.href;
            notification.userId = req.userObject.userId
        } else {
            notification.userId = req.body.userId
        }
        result = await notificationModel.updateNotification(notification);
    }

    if (typeof result === 'object') {
        logger.error('알림 내역 변경 실패 : ', result, clearNotification);
        return res.status(500).json({ message: `알림 내역을 변경하지 못했습니다.[${result.code || ''}]` })
    } else if (result === 0) {
        return res.status(404).json({ target: 'notificationId', message: '변경할 알림을 찾을 수 없습니다.' })
    } else {
        return res.status(200).json({ message: '알림 내역을 변경하였습니다.' })
    }
})
router.post('/', adminOnly, async (req, res) => {
    let notification = {
        type: req.body.type,
        template: req.body.template,
        variable1: req.body.variable1,
        variable2: req.body.variable2,
        variable3: req.body.variable3,
        variable4: req.body.variable4,
        userId: req.body.userId,
        groupId: req.body.groupId,
        href: req.body.href,
        target: req.body.target
    };
    if (!['CC', 'DC', 'EV', 'AN'].includes(notification.type)) {
        return res.status(400).json({ target: 'type', message: '알림 타입이 올바르지 않습니다.' })
    }
    if (typeof notification.template !== 'string' || notification.template.length > 2000) {
        return res.status(400).json({ target: 'template', message: '알림 내용 템플릿이 2000자를 넘거나 형태가 올바르지 않습니다.' })
    }
    if (notification.variable1 && (typeof notification.variable1 !== 'string' || notification.variable1.length > 100)) {
        return res.status(400).json({ target: 'variable1', message: '알림 내용 변수1이 100자를 넘거나 형태가 올바르지 않습니다.' })
    }
    if (notification.variable2 && (typeof notification.variable2 !== 'string' || notification.variable2.length > 100)) {
        return res.status(400).json({ target: 'variable2', message: '알림 내용 변수2가 100자를 넘거나 형태가 올바르지 않습니다.' })
    }
    if (notification.variable3 && (typeof notification.variable3 !== 'string' || notification.variable3.length > 100)) {
        return res.status(400).json({ target: 'variable3', message: '알림 내용 변수3이 100자를 넘거나 형태가 올바르지 않습니다.' })
    }
    if (notification.variable4 && (typeof notification.variable4 !== 'string' || notification.variable4.length > 100)) {
        return res.status(400).json({ target: 'variable4', message: '알림 내용 변수4가 100자를 넘거나 형태가 올바르지 않습니다.' })
    }
    if (notification.userId !== undefined && typeof notification.userId !== 'string') {
        return res.status(400).json({ target: 'userId', message: '알림을 보낼 사용자 ID가 올바르지 않습니다.' })
    }
    if (typeof notification.groupId === 'string') {
        notification.groupId = 1 * notification.groupId
    }
    if (notification.groupId !== undefined && (!Number.isInteger(notification.groupId) || notification.groupId === 0)) {
        return res.status(400).json({ target: 'groupId', message: '알림을 보낼 그룹ID가 올바르지 않습니다.' })
    }
    if (notification.target && typeof notification.target !== 'number') {
        return res.status(400).json({ target: 'target', message: '알림 내용 타겟의 형태가 올바르지 않습니다.(숫자)' })
    }
    if (notification.href && (typeof notification.href !== 'string' || notification.href.length > 100)) {
        return res.status(400).json({ target: 'href', message: '알림 링크가 100자를 넘거나 형태가 올바르지 않습니다.' })
    }

    if (notification.groupId) {
        let users = await userModel.getUsers(null, null, null, notification.groupId);
        if (Array.isArray(users)) {
            let i = 0;
            delete notification.userId;
            notificationModel.createNotification(notification, users.map(x => x.userId));
            return res.status(200).json({ message: '그룹 전체에 알림을 만들게 했습니다.' });
        } else {
            logger.error('알림 생성하기 위한 그룹별 유저 가져오기 중 에러 : ', users, notification.groupId);
            return res.status(500).json({ message: `알림을 만들지 못했습니다.[${result.code || ''}]` })
        }
    }
    console.log(notification);
    let result;
    if (notification.userId) {
        result = await notificationModel.createNotification(notification);
        if (result.rowCount > 0 && result.rows && result.rows[0] && result.rows[0].notificationId > 0) {
            return res.status(200).json({ message: '알림을 만들었습니다.', notificationId: result.rows[0].notificationId })
        } else if (result.code) {
            logger.error('알림 생성 시 에러 : ', result, notification);
            return res.status(500).json({ message: `알림을 만들지 못했습니다.[${result.code || ''}]` })
        } else {
            logger.error('알림 생성 시 에러(2) : ', result, notification);
            return res.status(500).json({ message: '알림을 만들지 못헀습니다...' });
        }
    } else {
        result = notificationModel.createNotification(notification);
        return res.status(200).json({ message: '회원 전체에 알림을 만들게 했습니다.' });
    }
})

router.delete('/:notificationId([0-9]+)', requiredSignin, async (req, res) => {
    let notificationId = req.params.notificationId;
    if (typeof notificationId === 'string') {
        notificationId = 1 * notificationId;
    }
    if (!Number.isInteger(notificationId) || notificationId === 0) {
        return res.status(400).json({ target: 'notificationId', message: '삭제할 알림을 찾을 수 없습니다.' });
    }
    let result;
    if (!req.userObject.isAdmin) {
        result = await notificationModel.getNotification(notificationId);
        if (Array.isArray(result) && result.length > 0) {
            if (result[0].userId !== req.userObject.userId) {
                return res.status(403).json({ target: 'notificationId', message: '알림을 삭제할 수 있는 권한이 없습니다.' })
            }
        } else {
            return res.status(404).json({ target: 'notificationId', message: '삭제할 알림을 찾을 수 없습니다.' });
        }
    }

    result = await notificationModel.deleteNotification(notificationId);
    if (typeof result === 'object') {
        logger.error('알림 삭제 중 에러 : ', result, req.userObject.userId, notificationId)
        return res.status(500).json({ message: `알림을 삭제하던 중 오류가 발생했습니다.[${result.code || ''}]` });
    } else if (result === 0) {
        return res.status(404).json({ target: 'notificationId', message: '삭제할 알림을 찾을 수 없습니다.' });
    } else {
        return res.status(200).json({ message: '알림을 삭제하였습니다.' });
    }
})
module.exports = router;
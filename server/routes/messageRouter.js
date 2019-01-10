const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin'),
    messageModel = require('../models/messageModel'),
    userModel = require('../models/userModel'),
    logger = require('../logger');
const { moment } = require('../util');
//based on /message

router.get('/list', requiredSignin, async (req, res) => {
    if (req.query.chatType && !['T', 'L'].includes(req.query.chatType)) {
        return res.status(400).json({ target: 'chatType', message: '잘못된 요청입니다.' });
    }
    if (typeof req.query.page === 'string') {
        req.query.page = 1 * req.query.page;
    }
    if (req.query.page !== undefined && (!Number.isInteger(req.query.page) || req.query.page < 1)) {
        return res.status(400).json({ target: 'page', message: '잘못된 요청입니다.' });
    }
    let result = await messageModel.getChats(req.userObject.userId, null, req.query.chatType, req.query.page)
    let other;
    if (!Array.isArray(result)) {
        logger.error('채팅 내용 조회 중 에러 : ', result, req.userObject.userId, req.query.chatType)
        return res.status(500).json({ message: `채팅 정보를 받아오는 중에 오류가 발생했습니다.[${result.code || ''}]` });
    } else {
        let i = 0;
        while (i < result.length) {
            result[i].otherStatus = (result[i].user1Id === req.userObject.userId ? result[i].user2Status : result[i].user1Status);
            other = await userModel.getUser(result[i].user1Id === req.userObject.userId ? result[i].user2Id : result[i].user1Id);
            if (Array.isArray(other) && other.length > 0) {
                result[i].otherNickName = req.query.chatType === 'T' ? other[0].topicNickName : other[0].loungeNickName
                result[i].picturePath = req.query.chatType === 'T' ? null : other[0].picturePath
            } else {
                result[i].otherNickName = '(알 수 없음)'
            }
            delete result[i].user1Id;
            delete result[i].user2Id;
            delete result[i].user1Status;
            delete result[i].user2Status;
            i++;
        }
        return res.status(200).json(result);
    }
});

router.post('/list', requiredSignin, async (req, res) => {
    let chat = { ...req.body };
    //parameter safe check
    if (typeof chat.nickName !== 'string' || chat.nickName === '') {
        return res.status(400).json({ target: 'nickName', message: '채팅을 시작할 대상을 찾을 수 없습니다.' });
    } else if (chat.chatType !== 'T' && chat.chatType !== 'L') {
        return res.status(400).json({ target: 'chatType', message: '잘못된 요청입니다.' });
    }
    const other = await userModel.getUserIdByNickName(chat.nickName, chat.chatType);
    if (!Array.isArray(other) || other.length < 1 || other[0].status === 'DELETED') {
        return res.status(404).json({ target: 'nickName', message: '채팅을 시작할 대상이 존재하지 않습니다.' })
    }

    let result = await messageModel.getChats(req.userObject.userId, other[0].userId, chat.chatType);
    if (Array.isArray(result) && result.length > 0) {
        let i = 0;
        while (i < result.length) {
            if (result[i].user1Status === 'NORMAL' && result[i].user2Status === 'NORMAL') {
                return res.status(409).json({ message: '이미 개설된 채팅이 있습니다.', chatId: result[i].chatId });
            }
            i++;
        }
    }
    result = await messageModel.createChat(req.userObject.userId, other[0].userId, chat.chatType);
    if ((typeof result === 'object' && result.code) || result.rowCount === 0) {
        logger.error('채팅 생성 중 에러 : ', result, req.userObject.userId, chat)
        return res.status(500).json({ message: `채팅을 개설하던 중 오류가 발생했습니다.[${result.code || ''}]` });
    } else {
        return res.status(200).json({ message: '새로운 채팅을 개설하였습니다.', chatId: result.rows[0].chatId });
    }
})

router.get('/', requiredSignin, async (req, res) => {
    let query = { ...req.query };
    if (typeof query.chatId === 'string') {
        query.chatId = 1 * query.chatId;
    }
    if (!Number.isInteger(query.chatId) || query.chatId === 0) {
        return res.status(400).json({ target: 'chatId', message: '채팅을 찾을 수 없습니다.' });
    }
    if (query.timestampBefore && !moment(query.timestampBefore, 'YYYYMMDDHHmmss').isValid()) {
        return res.status(400).json({ target: 'timestampBefore', message: '조회 조건이 올바르지 않습니다.' });
    }
    if (query.timestampAfter && !moment(query.timestampAfter, 'YYYYMMDDHHmmss').isValid()) {
        return res.status(400).json({ target: 'timestampAfter', message: '조회 조건이 올바르지 않습니다.' });
    }
    if (!query.timestampAfter && !query.timestampBefore) {
        query.timestampBefore = moment().format('YMMDDHHmmss');
    }
    let result = await messageModel.getChat(query.chatId);
    if (!Array.isArray(result) || result.length < 1) {
        return res.status(404).json({ target: 'chatId', message: '존재하지 않는 채팅입니다.' });
    } else if (result[0].user1Id !== req.userObject.userId && result[0].user2Id !== req.userObject.userId) {
        return res.status(403).json({ target: 'chatId', message: '조회할 수 없는 채팅입니다.' });
    }
    result = await messageModel.getMessages(query.chatId, query.timestampBefore, query.timestampAfter);
    if (!Array.isArray(result)) {
        logger.error('채팅 내용 조회 중 에러 : ', result, req.userObject.userId, query)
        return res.status(500).json({ message: `채팅 내용을 받아오는 중에 오류가 발생했습니다.[${result.code || ''}]` });
    } else {
        result.forEach(x => {
            x.isSender = (x.senderUserId === req.userObject.userId);
            delete x.senderUserId;
        })
        return res.status(200).json(result);
    }
});

router.post('/', requiredSignin, async (req, res) => {
    let message = { ...req.body };
    //parameter safe check
    if (typeof message.chatId === 'string') {
        message.chatId = 1 * message.chatId;
    }
    if (!Number.isInteger(message.chatId) || message.chatId === 0) {
        return res.status(400).json({ target: 'chatId', message: '메시지를 보낼 채팅을 선택해주세요.' });
    } else if (typeof message.contents !== 'string' || message.contents === '') {
        return res.status(400).json({ target: 'contents', message: '메시지 내용을 입력해주세요.' });
    }
    let result = await messageModel.getChat(message.chatId);
    if (!Array.isArray(result) || result.length < 1) {
        return res.status(404).json({ target: 'chatId', message: '존재하지 않는 채팅입니다.' });
    } else if (result[0].user1Id !== req.userObject.userId && result[0].user2Id !== req.userObject.userId) {
        return res.status(403).json({ target: 'chatId', message: '메시지를 보낼 수 있는 채팅이 아닙니다.' });
    } else if ((result[0].user1Status !== 'NORMAL') || (result[0].user2Status !== 'NORMAL')) {
        return res.status(400).json({ target: 'chatId', message: '상대방이 채팅을 종료하였습니다.' });
    }
    result = await messageModel.createMessage(message.chatId, req.userObject.userId, message.contents);
    if (typeof result === 'object') {
        logger.error('채팅 내 메시지 생성 중 에러 : ', result, req.userObject.userId, message)
        return res.status(500).json({ message: `메시지를 보내던 중 오류가 발생했습니다.[${result.code || ''}]` });
    } else if (result === 0) {
        return res.status(404).json({ message: '메시지를 보내지 못했습니다. 다시 시도해주세요.' });
    } else {
        if (message.lastSendTimestamp) {
            result = await messageModel.getMessages(message.chatId, null, message.lastSendTimestamp, true);
            if (Array.isArray(result)) {
                result.forEach(x => {
                    x.isSender = (x.senderUserId === req.userObject.userId);
                    delete x.senderUserId;
                })
                return res.status(200).json({ message: '메시지를 보냈습니다.', messageList: result })
            } else {
                return res.status(200).json({ message: '메시지를 보냈습니다.', messageList: [] });
            }
        } else {
            return res.status(200).json({ message: '메시지를 보냈습니다.' });
        }
    }
});

router.delete('/:chatId([0-9]+)', requiredSignin, async (req, res) => {
    let chatId = req.params.chatId;
    if (typeof chatId === 'string') {
        chatId = 1 * chatId;
    }
    if (!Number.isInteger(chatId) || chatId === 0) {
        return res.status(400).json({ target: 'chatId', message: '삭제할 채팅을 찾을 수 없습니다.' });
    }
    let result = await messageModel.getChat(chatId);
    if (!Array.isArray(result) || result.length < 1 || (result[0].user1Id !== req.userObject.userId && result[0].user2Id !== req.userObject.userId)) {
        return res.status(403).json({ target: 'chatId', message: '채팅을 삭제할 수 있는 권한이 없습니다.' });
    }
    if (result[0].user1Id === req.userObject.userId) { //user1
        if (result[0].user1Status === 'NORMAL') {
            if (result[0].user2Status === 'NORMAL') { //change flag
                result = await messageModel.updateChat(chatId, req.userObject.userId, 'DELETED')
            } else { //delete
                result = await messageModel.deleteChat(chatId);
            }
        } else {
            return res.status(400).json({ target: 'chatId', message: '이미 삭제된 채팅입니다.' })
        }
    } else { //user2
        if (result[0].user2Status === 'NORMAL') {
            if (result[0].user1Status === 'NORMAL') { //change flag
                result = await messageModel.updateChat(chatId, req.userObject.userId, 'DELETED')
            } else { //delete
                result = await messageModel.deleteChat(chatId);
            }
        } else {
            return res.status(400).json({ target: 'chatId', message: '이미 삭제된 채팅입니다.' })
        }
    }
    if (typeof result === 'object') {
        logger.error('채팅 삭제 중 에러 : ', result, req.userObject.userId, chatId)
        return res.status(500).json({ message: `채팅을 삭제하던 중 오류가 발생했습니다.[${result.code || ''}]` });
    } else if (result === 0) {
        return res.status(404).json({ message: '존재하지 않는 채팅입니다.' });
    } else {
        return res.status(200).json({ message: `채팅을 삭제하였습니다.` });
    }
})
module.exports = router;
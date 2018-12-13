const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly'),
    logger = require('../logger'),
    { moment, getYYYYMMDD } = require('../util'),
    { authDeniedParentGroupId } = require('../../config');
const groupModel = require('../models/groupModel'),
    boardModel = require('../models/boardModel'),
    sanctionModel = require('../models/sanctionModel'),
    userModel = require('../models/userModel'),
    notificationModel = require('../models/notificationModel'),
    documentModel = require('../models/documentModel'),
    commentModel = require('../models/commentModel');
//based on /sanction

router.get('/', adminOnly, async (req, res) => {
    let userId = req.query.userId;
    if (typeof userId !== 'string') {
        return res.status(400).json({target:'userId', message:'사용자 ID값이 올바르지 않습니다.'})
    }
    let boardId = req.query.boardId;
    if (boardId && typeof boardId !== 'string') {
        return res.status(400).json({target:'boardId', message:'게시판ID가 올바르지 않습니다.'})
    }

    let result = await sanctionModel.getSanctions(userId, boardId)
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('제재 내역 조회 중 에러 : ', result, userId, boardId, req.userObject.userId)
        return res.status(500).json({ message: `제재 내역을 가져오지 못했습니다.[${result.code || ''}]` });
    }
});

router.post('/', adminOnly, async (req, res) => {
    let sanction = {
        userId: req.body.userId,
        documentId: req.body.documentId,
        commentId: req.body.commentId,
        boardId: req.body.boardId,
        writeRestrictDays: req.body.writeRestrictDays,
        readRestrictDays: req.body.readRestrictDays,
        isBan: req.body.isBan//ban this user
    };
    if (sanction.userId && typeof sanction.userId !== 'string') {
        return res.status(400).json({ target: 'userId', message: '제재 대상 사용자 ID가 올바르지 않습니다.' })
    }
    if(typeof sanction.documentId === 'string'){
        sanction.documentId = 1 * sanction.documentId
    }
    if(sanction.documentId !== undefined && !Number.isInteger(sanction.documentId)){
        return res.status(400).json({target:'documentId', message:'제재 대상 게시물 ID가 올바르지 않습니다.'})        
    }
    if(typeof sanction.commentId === 'string'){
        sanction.commentId = 1 * sanction.commentId
    }
    if(sanction.commentId !== undefined && !Number.isInteger(sanction.commentId)){
        return res.status(400).json({target:'commentId', message:'제재 대상 댓글 ID가 올바르지 않습니다.'})        
    }
    if(!sanction.userId && !sanction.documentId && !sanction.commentId && !sanction.isBan){
        return res.status(400).json({message:'제재 대상을 찾을 수 없습니다.'});
    }
    
    let result;
    if(!sanction.userId && sanction.commentId){
        result = await commentModel.getComment(sanction.commentId);
        if(Array.isArray(result) && result.length > 0){
            sanction.userId = result[0].userId;
        }else{
            return res.status(404).json({target:'commentId', message:'제재 대상 댓글을 찾을 수 없습니다.'})
        }
    }else if(!sanction.userId && sanction.documentId){
        result = await documentModel.getDocument(sanction.documentId);
        if(Array.isArray(result) && result.length > 0){
            sanction.userId = result[0].userId;
        }else{
            return res.status(404).json({target:'documentId', message:'제재 대상 게시물을 찾을 수 없습니다.'})
        }
    }
    const user = await userModel.getUser(sanction.userId);
    if(!Array.isArray(user) || user.length === 0){
        return res.status(404).json({target:'userId', message:'존재하지 않는 사용자ID입니다.'})
    }else if(user[0].status === 'DELETED'){
        return res.status(400).json({target:'userId', message:'이미 삭제처리된 사용자ID입니다.'})
    }
    
    if(sanction.isBan === true){
        const banGroup = await groupModel.getGroupsByParentGroupId(authDeniedParentGroupId);
        if(Array.isArray(banGroup) && banGroup.length > 0){
            result = await groupModel.createUserGroup(sanction.userId, banGroup[0].groupId);
            if(result > 0){
                result = await notificationModel.createNotification({
                    userId: sanction.userId,
                    type: 'AN',
                    href: '/',
                    template: `접수된 신고로 인하여 영구적으로 인증이 취소되었습니다.`,
                    target: 'ban'
                })
                if(result.rowCount > 0){
                    result = await userModel.updateUserInfo({
                        userId:sanction.userId, 
                        memo:`${user[0].memo ? user[0].memo + '\n' : ''}${getYYYYMMDD()}: 인증취소[${req.userObject.userId}]`
                    })
                    await sanctionModel.createSanction({
                        userId:sanction.userId,
                        adminId:req.userObject.userId,
                        sanctionContents: `인증취소`
                    })
                    return res.status(200).json({message:'사용자를 영구적으로 인증취소하였습니다.'});
                }else{
                    groupModel.deleteUserGroup(sanction.userId, banGroup[0].groupId);
                    return res.status(500).json({message:`사용자를 제재하던 중 오류가 발생하였습니다. 관리자에게 문의해주세요.[${result.code || ''}]`})
                }
            }else{
                return res.status(500).json({message:`사용자를 제재하지 못했습니다.[${result.code || ''}]`})
            }
        }else{
            return res.status(500).json({message:'영구 불인증 상위그룹이 지정되어있지 않거나, 해당 그룹에 속해있는 하위그룹이 존재하지 않습니다. 그룹 지정 후 다시 시도해주세요.'});
        }
    }else{
        if (typeof sanction.boardId !== 'string') {
            return res.status(400).json({ target: 'boardId', message: '제재 대상 게시판ID가 올바르지 않습니다.' })
        }
        if(typeof sanction.writeRestrictDays === 'string'){
            sanction.writeRestrictDays = 1 * sanction.writeRestrictDays
        }
        if (sanction.writeRestrictDays && !Number.isInteger(sanction.writeRestrictDays)) {
            return res.status(400).json({ target: 'writeRestrictDays', message: '글쓰기 제한 일수가 올바르지 않습니다.' })
        }
        if(typeof sanction.readRestrictDays === 'string'){
            sanction.readRestrictDays = 1 * sanction.readRestrictDays
        }
        if (sanction.readRestrictDays && !Number.isInteger(sanction.readRestrictDays)) {
            return res.status(400).json({ target: 'readRestrictDays', message: '글읽기 제한 일수가 올바르지 않습니다.' })
        }
        if(!sanction.writeRestrictDays && !sanction.readRestrictDays){
            return res.status(400).json({message:'제재할 내용을 입력해주세요.'})
        }
        
        const board = await boardModel.getBoard(sanction.boardId);
        if(!Array.isArray(board) || board.length === 0){
            return res.status(404).json({target:'boardId', message:'존재하지 않는 게시판ID입니다.'})
        }
        
        result = await boardModel.getUserBoard(sanction.userId, sanction.boardId, true);
        let writeRestrictDate, readRestrictDate;
        if(!Array.isArray(result)){
            return res.status(500).json({message:`기존 제재 내역을 불러오지 못했습니다.[${result.code || ''}]`});
        }else if(result.length > 0){
            if(sanction.writeRestrictDays && result[0].writeRestrictDate && moment(result[0].writeRestrictDate, 'YYYYMMDD').isAfter(moment())){//아직 끝나지 않은 제한 내역이 존재하면 연장처리
                writeRestrictDate = moment(result[0].writeRestrictDate, 'YYYYMMDD').add(sanction.writeRestrictDays, 'days').format('YYYYMMDD')
            }
            if(sanction.readRestrictDays && result[0].readRestrictDate && moment(result[0].readRestrictDate, 'YYYYMMDD').isAfter(moment())){//아직 끝나지 않은 제한 내역이 존재하면 연장처리
                readRestrictDate = moment(result[0].readRestrictDate, 'YYYYMMDD').add(sanction.readRestrictDays, 'days').format('YYYYMMDD')
            }
        }
        if(sanction.writeRestrictDays && !writeRestrictDate){
            writeRestrictDate = moment().add(sanction.writeRestrictDays, 'days').format('YYYYMMDD')
        }
        if(sanction.readRestrictDays && !readRestrictDate){
            readRestrictDate = moment().add(sanction.readRestrictDays, 'days').format('YYYYMMDD')
        }
        
        if(result.length > 0){//update
            result = await boardModel.updateUserBoard(sanction.userId, sanction.boardId, null, writeRestrictDate, readRestrictDate);
        }else{//create
            result = await boardModel.createUserBoard(sanction.userId, sanction.boardId, writeRestrictDate, readRestrictDate);
        }
        if(result > 0){
            result = await notificationModel.getNotifications(sanction.userId, null, 'AN', board[0].boardId);
            if(Array.isArray(result) && result.length > 0 && result.some(x=>!x.isRead)){//exists not read, same notification - update the notification
                const original = result.find(x=>!x.isRead);
                let parameters = {
                    notificationId: original.notificationId,
                    variable1: sanction.writeRestrictDays? moment(writeRestrictDate, 'YYYYMMDD').format('YYYY-MM-DD') : original.value1,
                    variable2: sanction.readRestrictDays? moment(readRestrictDate, 'YYYYMMDD').format('YYYY-MM-DD') : original.value2
                }
                if((sanction.writeRestrictDays && !original.variable1) || (sanction.readRestrictDays && !original.variable2)){
                    parameters.template = `접수된 신고로 인하여 ${board[0].boardName}에 글쓰기가 $1까지, 글읽기가 $2까지 제한됩니다.`
                }
                result = await notificationModel.updateNotification(parameters)
            }else{//create new notification
                result = await notificationModel.createNotification({
                    userId: sanction.userId,
                    type: 'AN',
                    href: '/myPage',
                    template: `접수된 신고로 인하여 ${board[0].boardName}에 ${sanction.writeRestrictDays? '글쓰기가 $1까지' + (sanction.readRestrictDays?', ':'') : ''}${sanction.readRestrictDays? '글읽기가 $2까지' : ''} 제한됩니다.`,
                    variable1: sanction.writeRestrictDays? moment(writeRestrictDate, 'YYYYMMDD').format('YYYY-MM-DD') : undefined,
                    variable2: sanction.readRestrictDays ? moment(readRestrictDate, 'YYYYMMDD').format('YYYY-MM-DD') : undefined,
                    target: board[0].boardId
                })
            }
            userModel.updateUserInfo({
                userId:sanction.userId, 
                memo:`${user[0].memo ? user[0].memo + '\n' : ''}${getYYYYMMDD()}: ${sanction.boardId} 게시판 ${sanction.writeRestrictDays? '글쓰기 제한 ' + sanction.writeRestrictDays + '일' + (sanction.readRestrictDays?', ':'') : ''}${sanction.readRestrictDays? '읽기 제한 ' + sanction.readRestrictDays + '일' : ''}[${req.userObject.userId}]`
            })
            sanctionModel.createSanction({
                ...sanction,
                adminId:req.userObject.userId,
                sanctionContents: `${sanction.boardId}, ${sanction.writeRestrictDays? '쓰기 제한 ' + sanction.writeRestrictDays + '일' + (sanction.readRestrictDays?', ':'') : ''}${sanction.readRestrictDays? '읽기 제한 ' + sanction.readRestrictDays + '일' : ''}`
            })
            return res.status(200).json({message:'회원을 제재처리했습니다.'})
        }else{
            return res.status(500).json({message:`회원 제재를 하지 못했습니다.[${result.code || ''}]`})
        }
    }
})

module.exports = router;
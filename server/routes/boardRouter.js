const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin'),
    adminOnly = require('../middlewares/adminOnly');
const boardModel = require('../models/boardModel'),
userModel = require('../models/userModel'),
groupModel = require('../models/groupModel')
const { safeStringLength, moment } = require('../util'),
logger = require('../logger');

//based on /board


router.get('/', requiredSignin, async (req, res) => {
    let boardId = req.query.boardId;
    if(!boardId || typeof boardId !== 'string'){
        return res.status(400).json({target:'boardId', message:'요청을 수행하기 위한 필수 정보가 없거나 올바르지 않습니다.'});
    }
    let board = await boardModel.getBoard(boardId)
    if(Array.isArray(board) && board.length>0 && board[0].status === 'NORMAL'){//오류, 존재하지 않음, 삭제된 게시판
        board = board[0];
    }else{
        return res.status(404).json({target:'boardId', message:'존재하지 않는 라운지/토픽입니다.'});
    }
    let owner = await userModel.getUser(board.ownerId);
    if(Array.isArray(owner) && owner.length > 0){
        board.owner = board.boardType === 'T'? owner[0].topicNickName : owner[0].loungeNickName;
    }else{
        board.owner = null;
    }
    delete board.ownerId;
    delete board.status;
    if(board.allGroupAuth !== 'READWRITE'){
        board.boardAuth = await boardModel.getBoardAuthName(board.boardId, req.userObject.isAdmin);
    }
    return res.status(200).json(board);
});

router.put('/', requiredSignin, async (req, res) => {
    let boardId = req.body.boardId;
    if(typeof boardId !== 'string'){
        return res.status(400).json({target:'boardId', message:'요청을 수행하기 위해 필요한 정보가 없거나 올바르지 않습니다.'})
    }
    const board = await boardModel.getBoard(boardId);
    if(!Array.isArray(board) || board.length < 1){
        return res.status(404).json({target:'boardId', message:'존재하지 않는 라운지/토픽입니다.'});
    }else if(board[0].ownerId !== req.userObject.userId && !req.userObject.isAdmin){
        return res.status(403).json({target:'boardId', message:'라운지/토픽 정보를 변경할 수 있는 권한이 없습니다.'});
    }else if(board[0].reservedContents && !req.body.overwrite){
        return res.status(403).json({message:`이미 ${moment(board[0].reservedDate, 'YYYYMMDD').format('YYYY-M-D')}에 예약된 변경내용이 존재합니다.`});
    }
    let reservedContents = {};
    if(typeof req.body.boardName === 'string' && req.body.boardName !== ''){
        reservedContents.boardName = safeStringLength(req.body.boardName, 200)
    }
    if(typeof req.body.boardDescription === 'string'){
        reservedContents.boardDescription = safeStringLength(req.body.boardDescription, 1000)
    }
    if(typeof req.body.ownerNickName === 'string'){
        const nextOwner = await userModel.getUserIdByNickName(req.body.ownerNickName, board[0].boardType);
        if(!Array.isArray(nextOwner) || nextOwner.length < 1){
            return res.status(404).json({target:'ownerNickName', message:'존재하지 않는 사용자를 선택하셨습니다.'})
        } else{
            let result = await boardModel.getUserBoard(nextOwner[0].userId);
            if(!Array.isArray(result) || !result.find(x=>x.boardId === boardId)){
                return res.status(404).json({target:'ownerNickName', message:'해당 사용자는 이 라운지/토픽을 구독중이지 않습니다.'})
            }
        }
        reservedContents.ownerId = nextOwner[0].userId
    }
    if(typeof req.body.isAnonymousable === 'boolean'){
        reservedContents.isAnonymousable = req.body.isAnonymousable
    }
    if(typeof req.body.status === 'string' && ['NORMAL', 'DELETED'].indexOf(req.body.status) >= 0){
        reservedContents.status = req.body.status;
    }
    if(typeof req.body.allGroupAuth === 'string' && ['NONE', 'READONLY', 'READWRITE'].indexOf(req.body.allGroupAuth) >= 0){
        reservedContents.allGroupAuth = req.body.allGroupAuth
    }
    
    let groups = req.body.allowedGroups;
    if (groups) {
        if (!Array.isArray(groups)) {
            groups = [groups];
        }
        reservedContents.auth = [];
        groups = groups.filter(x=>x.authType === 'READONLY' || x.authType === 'READWRITE');
        let currentBoardAuth = await boardModel.getBoardAuth(boardId);
        let i=0, result;
        if(Array.isArray(currentBoardAuth)){
            while(i<groups.length){
                result = currentBoardAuth.find(x=>x.groupId === groups[i].groupId);
                if(result && result.authType !== groups[i].authType && ['READONLY', 'READWRITE'].indexOf(groups[i].authType)>=0){//exist
                    reservedContents.auth.push({groupId:groups[i].groupId, authType : groups[i].authType, command:'UPDATE'});                        
                }else if(['READONLY', 'READWRITE'].indexOf(groups[i].authType)>=0){//new group
                    result = await groupModel.getGroup(groups[i].groupId);
                    if (result && result[0] && (result[0].isOpenToUsers || req.userObject.isAdmin)) {
                        reservedContents.auth.push({groupId:groups[i].groupId, authType:groups[i].authType, command:'INSERT'});
                    }
                }
                i++;
            }
            i = 0;
            while (i < currentBoardAuth.length) {
                if (!(groups.find(x => x.groupId === currentBoardAuth[i].groupId))) { //deleted group
                    reservedContents.auth.push({groupId:currentBoardAuth[i].groupId, command:'DELETE'})
                }
                i++;
            }
        }
    }
    
    if(Object.keys(reservedContents).length < 1){
        return res.status(400).json({message:'변경될 내용이 없습니다.'});
    } else {
        let result = await boardModel.updateBoard({boardId:boardId, reservedDate:moment().add(1, 'months').format('YYYYMMDD'), reservedContents:reservedContents});
        if(typeof result === 'object' || result === 0){
            return res.status(500).json({message:`변경될 내용을 저장하는 데 실패하였습니다.[${result.code}] 다시 시도해주세요.`});
        }else{
            if(process.env.NODE_ENV === 'development'){
                await applyReservedContents(boardId);
            }
            return res.status(200).json({message:`정상적으로 변경예약되었습니다. 변경 내용은 ${moment().add(1, 'months').format('YYYY-MM-DD')}에 반영됩니다.`})
        }
    }
    
});

router.post('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.delete('/:boardId([a-zA-z]+)', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/list', requiredSignin, (req, res) => {
    res.status(501).end();
});

const applyReservedContents = async (boardId) => {
    let board = await boardModel.getBoard(boardId);
    if(!Array.isArray(board) || board.length === 0){
        return 0;
    }
    board = board[0];
    const reservedContents = board.reservedContents;
    if(reservedContents.auth){
        let i=0;
        while(i<reservedContents.auth.length){
            if(reservedContents.auth[i].command === 'INSERT'){
                boardModel.createBoardAuth(boardId, reservedContents.auth[i].groupId, reservedContents.auth[i].authType)
            }else if(reservedContents.auth[i].command === 'UPDATE'){
                boardModel.updateBoardAuth(boardId, reservedContents.auth[i].groupId, reservedContents.auth[i].authType)
            }else if(reservedContents.auth[i].command === 'DELETE'){
                boardModel.deleteBoardAuth(boardId, reservedContents.auth[i].groupId)
            }
            i++;
        }
    }
    delete board.reservedContents;
    delete board.reservedDate;
    let result = await boardModel.updateBoard(board);
    if(typeof result === 'object' || result === 0){
        logger.error('board update apply error : ' + result);
        return -1;
    }else{
        return 1;
    }
}
module.exports = router;
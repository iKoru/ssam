const router = require('express').Router();
const requiredAuth = require('../middlewares/requiredAuth'),
    adminOnly = require('../middlewares/adminOnly'),
    logger = require('../logger'),
    { dbErrorCode, commentNotificationTemplate, childCommentNotificationTemplate } = require('../constants');
const commentModel = require('../models/commentModel'),
    documentModel = require('../models/documentModel'),
    boardModel = require('../models/boardModel'),
    notificationModel = require('../models/notificationModel')
    //based on /comment

router.get('/', requiredAuth, async(req, res) => {
    let documentId = req.query.documentId,
        page = req.query.page;
    if (typeof documentId === 'string') {
        documentId = 1*documentId
    }
    if (!Number.isInteger(documentId) || documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
    if (typeof page === 'string') {
        page = 1*page
    }
    if (page !== undefined && !Number.isInteger(page) || page === 0) {
        return res.status(400).json({ target: 'page', message: '게시물을 찾을 수 없습니다.' });
    } else if (page < 1) {
        page = 1;
    }
    let result = await documentModel.getDocument(documentId);
    if (Array.isArray(result) && result.length > 0) {
        result = await boardModel.checkUserBoardReadable(req.userObject.userId, result[0].boardId);
        if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
            return res.status(403).json({ target: 'documentId', message: '댓글을 볼 수 있는 권한이 없습니다.' })
        }
    } else {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' })
    }
    result = await commentModel.getComments(documentId, page);
    if (Array.isArray(result)) {
        let i = 0;
        let child = await commentModel.getChildCommentsByDocumentId(documentId);
        while (i < result.length) {
            if (!req.userObject.isAdmin) {
                delete result[i].userId;
            }
            delete result[i].documentId;
            delete result[i].reserved1;
            delete result[i].reserved2;
            delete result[i].reserved3;
            delete result[i].reserved4;
            if (result[i].childCount > 0) {
                result[i].children = child.filter(x => x.parentCommentId === result[i].commentId);
            }
            i++;
        }
        return res.status(200).json(result);
    } else {
        logger.error('댓글 가져오기 에러 : ', result, documentId, page)
        return res.status(500).json({ message: `댓글을 가져오지 못했습니다.[${result.code || ''}]` });
    }
});

router.post('/', requiredAuth, async(req, res) => {
    let comment = {
        documentId: req.body.documentId,
        parentCommentId: req.body.parentCommentId,
        contents: req.body.contents,
        isAnonymous: req.body.isAnonymous,
        userId: req.userObject.userId
    }
    if (typeof comment.documentId === 'string') {
        comment.documentId = 1*comment.documentId
    }
    if (!Number.isInteger(comment.documentId) || comment.documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
    if (typeof comment.parentCommentId === 'string') {
        comment.parentCommentId = 1*comment.parentCommentId
    }
    if (comment.parentCommentId !== undefined && (!Number.isInteger(comment.parentCommentId) || comment.parentCommentId === 0)) {
        return res.status(400).json({ target: 'parentCommentId', message: '상위 댓글을 찾을 수 없습니다.' });
    }
    if (typeof comment.isAnonymous !== 'boolean') {
        return res.status(400).json({ target: 'isAnonymous', message: '익명여부 값을 입력해주세요.' });
    }
    if (!comment.contents) {
        return res.status(400).json({ target: 'contents', message: '댓글 내용을 입력해주세요.' })
    }

    const document = await documentModel.getDocument(comment.documentId);
    if (!Array.isArray(document) || document.length === 0) {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    } else if (document[0].isDeleted) {
        return res.status(403).json({ target: 'documentId', message: '삭제된 게시물에는 댓글을 작성할 수 없습니다.' })
    } else if (!document[0].allowAnonymous) {
        comment.isAnonymous = false;
    }
    let result;
    if(!req.userObject.isAdmin){
        result = await boardModel.checkUserBoardWritable(req.userObject.userId, document[0].boardId)
        if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
            return res.status(403).json({ target: 'documentId', message: '댓글을 등록할 수 있는 권한이 없습니다.' });
        }
    }
    if (!comment.isAnonymous) {
        result = await boardModel.getBoard(document[0].boardId);
        if (!Array.isArray(result) || result.length === 0) {
            return res.status(404).json({ target: 'documentId', message: '라운지/토픽을 찾을 수 없습니다.' });
        }
        comment.userNickName = result[0].boardType === 'T' ? req.userObject.topicNickName : req.userObject.loungeNickName
    }
    let parentComment;
    if (comment.parentCommentId) {
        parentComment = await commentModel.getComment(comment.parentCommentId);
        if (Array.isArray(parentComment) && parentComment.length > 0) {
            if (parentComment[0].isDeleted) {
                return res.status(400).json({ target: 'parentCommentId', message: '삭제된 댓글에는 대댓글을 작성할 수 없습니다.' })
            }
        } else {
            return res.status(404).json({ target: 'parentCommentId', message: '대댓글을 작성할 댓글을 찾을 수 없습니다.' })
        }
    }

    result = await commentModel.createComment(comment);
    if (result.rowCount > 0 && result.rows && result.rows.length > 0 && result.rows[0].commentId > 0) {
        res.status(200).json({ message: '댓글을 등록하였습니다.', commentId: result.rows[0].commentId });
        if(comment.parentCommentId){//알림 대상 : 대댓글
            if(parentComment[0].userId !== req.userObject.userId){//자기 댓글에 자기가 대댓글 작성하면 알림 없음
                let noti = await notificationModel.getNotifications(parentComment[0].userId, null, 'CC', parentComment[0].commentId);
                if(Array.isArray(noti)){
                    if(noti.length > 0 && !noti[0].isRead){//update 대상
                        await notificationModel.updateNotification({
                            notificationId:noti[0].notificationId,
                            variable1:(1*noti[0].variable1)+1
                        })
                    }else{//insert 대상
                        await notificationModel.createNotification({
                            userId:parentComment[0].userId,
                            type:'CC',
                            template:childCommentNotificationTemplate,
                            variable1:1,
                            variable2:null,
                            variable3:null,
                            variable4:null,
                            target:parentComment[0].commentId,
                            href:'/'+document[0].boardId + '/'+document[0].documentId
                        })
                    }
                }else{
                    logger.error('대댓글 알림내역 가져오기 중 에러 : ', noti, parentComment[0].commentId);
                }
            }
        }else{//알림 대상 : 댓글
            if(document[0].userId !== req.userObject.userId){//자기 글에 자기가 댓글 작성하면 알림 없음
                let noti = await notificationModel.getNotifications(document[0].userId, null, 'DC', document[0].documentId);
                if(Array.isArray(noti)){
                    if(noti.length > 0 && !noti[0].isRead){//update 대상
                        await notificationModel.updateNotification({
                            notificationId:noti[0].notificationId,
                            variable1:(1*noti[0].variable1)+1
                        })
                    }else{//insert 대상
                        await notificationModel.createNotification({
                            userId:document[0].userId,
                            type:'DC',
                            template:commentNotificationTemplate,
                            variable1:1,
                            variable2:null,
                            variable3:null,
                            variable4:null,
                            target:document[0].documentId,
                            href:'/'+document[0].boardId + '/'+document[0].documentId
                        })
                    }
                }else{
                    logger.error('댓글 알림내역 가져오기 중 에러 : ', noti, document[0].documentId);
                }
            }
        }
        return;
    } else {
        logger.error('댓글 등록 중 에러 : ', result, comment);
        return res.status(500).json({ message: `댓글을 등록하지 못했습니다.[${result.code || ''}]` });
    }
});

router.put('/', requiredAuth, async(req, res) => {
    let comment = {
        commentId: req.body.commentId,
        contents: req.body.contents,
        isDeleted: req.body.isDeleted,
        userId: req.userObject.userId
    }
    if (typeof comment.commentId === 'string') {
        comment.commentId = 1*comment.commentId
    }
    if (!Number.isInteger(comment.commentId) || comment.commentId === 0) {
        return res.status(400).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
    }
    if (comment.isDeleted !== undefined && typeof comment.isDeleted !== 'boolean') {
        return res.status(400).json({ target: 'isDeleted', message: '삭제여부 값이 올바르지 않습니다.' });
    }

    let result = await commentModel.getComment(comment.commentId);
    if (Array.isArray(result) && result.length > 0) {
        if (result[0].isDeleted && !req.userObject.isAdmin) {
            return res.status(400).json({ target: 'commentId', message: '삭제된 댓글입니다.' })
        } else if (result[0].userId !== req.userObject.userId && !req.userObject.isAdmin) {
            return res.status(403).json({ target: 'commentId', message: '댓글을 수정할 수 있는 권한이 없습니다.' })
        }
        if (comment.contents === result[0].contents) {
            delete comment.contents;
        }
        if (comment.isDeleted === result[0].isDeleted) {
            delete comment.isDeleted;
        }
        if ((comment.contents === undefined) && (comment.isDeleted === undefined)) {
            return res.status(400).json({ message: '수정할 내역이 없습니다.' });
        }
    } else {
        return res.status(404).json({ target: 'commentId', message: '수정할 댓글이 존재하지 않습니다.' })
    }

    result = await commentModel.updateComment(comment);
    if (result > 0) {
        return res.status(200).json({ message: `댓글을 ${comment.isDeleted?'삭제':'수정'}하였습니다.` })
    } else {
        logger.error('댓글 수정 중 에러 : ', result, req.userObject.userId, comment)
        return res.status(500).json({ message: `댓글을 수정하지 못했습니다.[${result.code || ''}]` })
    }
});

router.delete('/:commentId([0-9]+)', adminOnly, async(req, res) => {
    let commentId = req.params.commentId;
    if (typeof commentId === 'string') {
        commentId = 1*commentId;
    }
    if (!Number.isInteger(commentId) || commentId === 0) {
        return res.status(400).json({ target: 'commentId', message: '삭제할 댓글을 찾을 수 없습니다.' });
    }
    const comment = await commentModel.getComment(commentId);
    if (Array.isArray(comment) && comment.length > 0) {
        if ((comment[0].userId !== req.userObject.userId) && !req.userObject.isAdmin) {
            return res.status(403).json({ target: 'commentId', message: '댓글을 삭제할 수 있는 권한이 없습니다.' })
        }
        if (comment[0].childCount > 0) {
            return res.status(403).json({ target: 'childCount', message: '대댓글이 있는 댓글은 삭제할 수 없습니다.' })
        }
        let result = await commentModel.deleteComment(commentId);
        if (typeof result === 'object' || result === 0) {
            logger.error('댓글 삭제 중 에러 : ', result, commentId);
            return res.status(500).json({ message: `댓글을 삭제하는 중에 오류가 발생했습니다.[${result.code || ''}]` });
        } else {
            if (comment[0].parentCommentId) {
                await commentModel.updateComment({ commentId: comment[0].parentCommentId, child: -1 });
            }
            await documentModel.updateDocumentCommentCount(comment[0].documentId, -1);
            return res.status(200).json({ message: '댓글을 삭제하였습니다.' });
        }
    } else {
        return res.status(404).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
    }
});

router.get('/animal', adminOnly, async(req, res) => {
    let result = await commentModel.getAnimalNames();
    if (Array.isArray(result)) {
        return res.status(200).json(result.map(x => x.animalName));
    } else {
        logger.error('동물 이름 불러오기 에러 : ', result);
        return res.status(500).json({ message: `동물이름을 불러오는 데 실패하였습니다.[${result.code || ''}]` })
    }
})

router.post('/animal', adminOnly, async(req, res) => {
    let animalNames = req.body.animalNames;
    if (typeof animalNames === "string") {
        animalNames = [animalNames];
    }
    if (!Array.isArray(animalNames) || animalNames.length === 0) {
        return res.status(400).json({ target: 'animalNames', message: '등록할 동물이름을 입력해주세요.' })
    }
    let result = await commentModel.createAnimalNames(animalNames);
    if (result > 0) {
        return res.status(200).json({ message: '동물이름을 등록하였습니다.' })
    } else if (typeof result === 'object' && result.code === dbErrorCode.PKDUPLICATION) {
        return res.status(400).json({ target: 'animalNames', message: `이미 존재하는 동물 이름은 입력할 수 없습니다.[${result.detail || ''}]` })
    } else {
        logger.error('동물 이름 입력 중 에러 : ', result, animalNames);
        return res.status(500).json({ message: `동물 이름을 입력하지 못했습니다.[${result.code || ''}]` })
    }
})

router.delete('/animal/:animalName', adminOnly, async(req, res) => {
    let animalName = req.params.animalName;
    if (typeof animalName === "string") {
        animalName = [animalName];
    }
    if (!Array.isArray(animalName) || animalName.length === 0) {
        return res.status(400).json({ target: 'animalName', message: '삭제할 동물이름을 입력해주세요.' })
    }
    let result = await commentModel.deleteAnimalNames(animalName);
    if (result > 0) {
        return res.status(200).json({ message: '동물이름을 삭제하였습니다.' });
    } else {
        logger.error('동물 이름 삭제 중 에러 : ', result, animalName);
        return res.status(500).json({ message: `동물이름을 삭제하지 못했습니다.[${result.code || ''}]` })
    }
})

module.exports = router;
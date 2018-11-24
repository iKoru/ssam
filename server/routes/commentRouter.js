const router = require('express').Router();
const requiredAuth = require('../middlewares/requiredAuth'),
    adminOnly = require('../middlewares/adminOnly'),
    logger = require('../logger');
const commentModel = require('../models/commentModel'),
    documentModel = require('../models/documentModel'),
    boardModel = require('../models/boardModel')
    //based on /comment

router.get('/', requiredAuth, async(req, res) => {
    let documentId = req.query.documentId,
        page = req.query.page;
    if (typeof documentId === 'string') {
        documentId = parseInt(documentId)
    }
    if (!Number.isInteger(documentId)) {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
    if (typeof page === 'string') {
        page = parseInt(page)
    }
    if (!Number.isInteger(page)) {
        return res.status(404).json({ target: 'page', message: '게시물을 찾을 수 없습니다.' });
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
    result = await commentModel(documentId, page), child;
    if (Array.isArray(result)) {
        result.map(async x => {
            if (!req.userObject.isAdmin) {
                delete x.userId;
            }
            delete x.documentId;
            delete x.reserved1;
            delete x.reserved2;
            delete x.reserved3;
            delete x.reserved4;
            if (x.childCount > 0) {
                child = await commentModel.getChildComments(x.commentId, documentId);
                if (Array.isArray(child)) {
                    x.children = child;
                } else {
                    logger.error('대댓글 가져오기 실패 : ', child, documentId, x.commentId);
                }
            }
        })
        return res.status(200).json(result);
    } else {
        logger.error('댓글 가져오기 실패 : ', result, documentId, page)
        return res.status(500).json({ message: `댓글을 가져오지 못했습니다.[${result.code || ''}]` });
    }
});

router.post('/', requiredAuth, async(req, res) => {
    let comment = {
        documentId = req.body.documentId,
        parentCommentId: req.body.parentCommentId,
        contents: req.body.contents,
        isAnonymous: req.body.isAnonymous,
        userId: req.userObject.userId
    }
    if (typeof comment.documentId === 'string') {
        comment.documentId = parseInt(comment.documentId)
    }
    if (!Number.isInteger(comment.documentId)) {
        return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
    if (typeof comment.parentCommentId === 'string') {
        comment.parentCommentId = parseInt(comment.parentCommentId)
    }
    if (comment.parentCommentId !== undefined && !Number.isInteger(comment.parentCommentId)) {
        return res.status(400).json({ target: 'parentCommentId', message: '상위 댓글을 찾을 수 없습니다.' });
    }
    if (typeof comment.isAnonymous !== 'boolean') {
        return res.status(400).json({ target: 'isAnonymous', message: '익명여부 값을 입력해주세요.' });
    }

    const document = await documentModel.getDocument(comment.documentId);
    if (!Array.isArray(document) || document.length === 0) {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    } else if (document[0].isDeleted) {
        return res.status(403).json({ target: 'documentId', message: '삭제된 게시물입니다.' })
    } else if (!document[0].allowAnonymous) {
        comment.isAnonymous = false;
    }
    let result = await boardModel.checkUserBoardWritable(req.userObject.userId, document[0].boardId)
    if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
        return status(403).json({ target: 'documentId', message: '댓글을 등록할 수 있는 권한이 없습니다.' });
    }
    if (!comment.isAnonymous) {
        result = await boardModel.getBoard(document[0].boardId);
        if (!Array.isArray(result) || result.length === 0) {
            return res.status(404).json({ target: 'documentId', message: '라운지/토픽을 찾을 수 없습니다.' });
        }
        comment.userNickName = result[0].boardType === 'T' ? req.userObject.topicNickName : req.userObject.loungeNickName
    }

    result = await commentModel.createComment(comment);
    if (result.rowCount > 0 && result.rows && result.rows.length > 0 && result.rows[0].commentId > 0) {
        return res.status(200).json({ message: '댓글을 등록하였습니다.', commentId: result.rows[0].commentId })
    } else {
        logger.error('댓글 등록 중 에러 : ', result, comment);
        return res.status(500).json({ message: `댓글을 등록하지 못했습니다.[${result.code || ''}]` });
    }
});

router.put('/', requiredAuth, async(req, res) => {
    let comment = {
        commentId = req.body.commentId,
        contents: req.body.contents,
        isDeleted: req.body.isDeleted,
        userId: req.userObject.userId
    }
    if (typeof comment.commentId === 'string') {
        comment.commentId = parseInt(comment.commentId)
    }
    if (!Number.isInteger(comment.commentId)) {
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
    } else {
        return res.status(404).json({ target: 'commentId', message: '수정할 댓글이 존재하지 않습니다.' })
    }
    result = await commentModel.updateComment(comment);
    if (result > 0) {
        return res.status(200).json({ message: `댓글을 ${comment.isDeleted?'삭제':'수정'}하였습니다.` })
    } else {
        return res.status(500).json({ message: `댓글을 수정하지 못했습니다.[${result.code || ''}]` })
    }
});

router.delete('/:commentId(^[\\d]+$)', requiredAuth, async(req, res) => {
    let commentId = req.params.commentId;
    if (typeof commentId === 'string') {
        commentId = parseInt(commentId);
    }
    if (!Number.isInteger(commentId)) {
        return res.status(400).json({ target: 'commentId', message: '삭제할 댓글을 찾을 수 없습니다.' });
    }
    let result = await commentModel.getComment(commentId);
    if (Array.isArray(result) && result.length > 0) {
        if ((result[0].userId !== req.userObject.userId) && !req.userObject.isAdmin) {
            return res.status(403).json({ target: 'commentId', message: '댓글을 삭제할 수 있는 권한이 없습니다.' })
        }
        if (result[0].childCount > 0) {
            return res.status(403).json({ target: 'childCount', message: '대댓글이 있는 댓글은 삭제할 수 없습니다.' })
        }
        result = await commentModel.deleteComment(commentId);
        if (typeof result === 'object' || result === 0) {
            logger.error('댓글 삭제 중 에러 : ', result, commentId);
            return res.status(500).json({ message: `댓글을 삭제하는 중에 오류가 발생했습니다.[${result.code || ''}]` });
        } else {
            return res.status(200).json({ message: '댓글을 삭제하였습니다.' });
        }
    } else {
        return res.status(404).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
    }
});

router.get('/animal', adminOnly, async(req, res) => {
    let result = await commentModel.getAnimalNames();
    if (Array.isArray(result)) {
        return res.status(200).json(result);
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
    if (animalNames.length === 0) {
        return res.status(400).json({ target: 'animalNames', message: '등록할 동물이름을 입력해주세요.' })
    }
    let result = await commentModel.createAnimalNames(animalNames);
    if (result > 0) {
        return res.status(200).json({ message: '동물이름을 등록하였습니다.' })
    } else {
        logger.error('동물 이름 입력 중 에러 : ', result, animalNames);
        return res.status(500).json({ message: `동물 이름을 입력하지 못했습니다.[${result.code || ''}]` })
    }
})

router.delete('/animal/:animalName', adminOnly, async(req, res) => {
    let animalName = req.params.animalName;
    if (typeof animalName !== string && !Array.isArray(animalName)) {
        return res.status(400).json({ target: 'animalName', message: '삭제할 동물이름을 입력해주세요.' });
    }
    let result = await commentModel.deleteAnimalNames(typeof animalNames === 'object' ? animalNames : [animalNames]);
    if (result > 0) {
        return res.status(200).json({ message: '동물이름을 삭제하였습니다.' });
    } else {
        logger.error('동물 이름 삭제 중 에러 : ', result, animalname);
        return res.status(500).json({ message: `동물이름을 삭제하지 못했습니다.[${result.code || ''}]` })
    }
})

module.exports = router;
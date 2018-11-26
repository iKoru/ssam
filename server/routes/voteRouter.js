const router = require('express').Router();
const requiredAuth = require('../middlewares/requiredAuth'),
    voteModel = require('../models/voteModel');
const { dbErrorCode } = require('../constants');
//based on /vote
router.post('/document', requiredAuth, (req, res) => {
    let documentId = req.body.documentId;
    if (typeof comment.documentId === 'string') {
        comment.documentId = parseInt(comment.documentId)
    }
    if (!Number.isInteger(comment.documentId)) {
        return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
    const document = await documentModel.getDocument(documentId);
    if (!Array.isArray(document) || document.length === 0) {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    } else if (document[0].isDeleted) {
        return res.status(403).json({ target: 'documentId', message: '삭제된 게시물에는 추천을 할 수 없습니다.' })
    }
    let result = await boardModel.checkUserBoardReadable(req.userObject.userId, document[0].boardId)
    if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
        return res.status(403).json({ target: 'documentId', message: '게시물을 추천할 수 있는 권한이 없습니다.' });
    }

    result = await voteModel.createDocumentVote(req.userObject.userId, documentId, true);
    if (typeof result === 'number') {
        if (result > 0) {
            return res.status(200).json({ message: '추천했습니다.' });
        } else {
            return res.status(500).json({ message: '추천하지 못했습니다.' })
        }
    } else if (result.code === dbErrorCode.PKDUPLICATION) {
        return res.status(409).json({ message: '이미 추천하셨습니다.' });
    } else {
        logger.error('게시물 추천 중 에러 : ', result, documentId, req.userObject.userId)
        return res.status(500).json({ message: `추천하지 못했습니다.[${result.code || ''}]` })
    }
});

router.post('/comment', requiredAuth, (req, res) => {
    let commentId = req.body.commentId;
    if (typeof commentId === 'string') {
        commentId = parseInt(commentId)
    }
    if (!Number.isInteger(commentId)) {
        return res.status(400).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
    }
    const comment = await commentModel.getComment(commentId);
    if (!Array.isArray(comment) || comment.length === 0) {
        return res.status(404).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
    } else if (comment[0].isDeleted) {
        return res.status(403).json({ target: 'commentId', message: '삭제된 댓글에는 추천을 할 수 없습니다.' })
    }
    const document = await documentModel.getDocument(comment[0].documentId);
    if (!Array.isArray(document) || document.length === 0) {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    } else if (document[0].isDeleted) {
        return res.status(403).json({ target: 'documentId', message: '삭제된 게시물에는 추천을 할 수 없습니다.' })
    }
    let result = await boardModel.checkUserBoardReadable(req.userObject.userId, document[0].boardId)
    if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
        return res.status(403).json({ target: 'documentId', message: '댓글을 추천할 수 있는 권한이 없습니다.' });
    }

    result = await voteModel.createCommentVote(req.userObject.userId, commentId, true);
    if (typeof result === 'number') {
        if (result > 0) {
            return res.status(200).json({ message: '추천했습니다.' });
        } else {
            return res.status(500).json({ message: '추천하지 못했습니다.' })
        }
    } else if (result.code === dbErrorCode.PKDUPLICATION) {
        return res.status(409).json({ message: '이미 추천하셨습니다.' });
    } else {
        logger.error('댓글 추천 중 에러 : ', result, commentId, req.userObject.userId)
        return res.status(500).json({ message: `추천하지 못했습니다.[${result.code || ''}]` })
    }
});

module.exports = router;
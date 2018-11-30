const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly'),
    requiredAuth = require('../middlewares/requiredAuth'),
    requiredSignin = require('../middlewares/requiredSignin'),
    boardModel = require('../models/boardModel'),
    documentModel = require('../models/documentModel'),
    commentModel = require('../models/commentModel'),
    reportModel = require('../models/reportModel'),
    logger = require('../logger');
const { dbErrorCode } = require('../constants');
//based on /report
router.post('/document', requiredAuth, async(req, res) => {
    let documentId = req.body.documentId;
    if (typeof documentId === 'string') {
        documentId = 1*documentId
    }
    if (!Number.isInteger(documentId) || documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
    let reportTypeId = req.body.reportTypeId;
    if (typeof reportTypeId === 'string') {
        reportTypeId = 1*reportTypeId;
    }
    if (!Number.isInteger(reportTypeId) || reportTypeId === 0) {
        return res.status(400).json({ target: 'reportTypeId', message: '신고 구분이 적절하지 않습니다.' })
    }
    const document = await documentModel.getDocument(documentId);
    if (!Array.isArray(document) || document.length === 0) {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    } else if (document[0].isDeleted) {
        return res.status(403).json({ target: 'documentId', message: '삭제된 게시물은 신고할 수 없습니다.' })
    }
    const board = await boardModel.getBoard(document[0].boardId);
    if (!Array.isArray(board) || board.length === 0) {
        return res.status(404).json({ taregt: 'boardId', message: '라운지/토픽을 찾을 수 없습니다.' })
    }
    let result = await boardModel.checkUserBoardReadable(req.userObject.userId, board[0].boardId)
    if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
        return res.status(403).json({ target: 'documentId', message: '게시물을 신고할 수 있는 권한이 없습니다.' });
    }
    const report = await reportModel.getReportType(reportTypeId);
    if (!Array.isArray(report) || report.length === 0) {
        return res.status(404).json({ target: 'reportTypeId', message: '신고 구분이 올바르지 않습니다.' })
    }

    result = await reportModel.createDocumentReport(req.userObject.userId, documentId, reportTypeId, board[0].boardType === 'T' ? req.userObject.topicNickName : req.userObject.loungeNickName);
    if (result > 0) {
        return res.status(200).json({ message: '신고했습니다.' });
    } else if (typeof result === 'object' && result.code === dbErrorCode.PKDUPLICATION) {
        return res.status(409).json({ message: '이미 신고하셨습니다.' });
    } else {
        logger.error('게시물 신고 중 에러 : ', result, documentId, req.userObject.userId)
        return res.status(500).json({ message: `신고하지 못했습니다.[${result.code || ''}]` })
    }
});

router.put('/document', adminOnly, async(req, res) => {
    let report = {
        documentId: req.body.documentId,
        userId: req.body.userId,
        status: req.body.status
    }
    if (typeof report.documentId === 'string') {
        report.documentId = 1*report.documentId
    }
    if (!Number.isInteger(report.documentId) || report.documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
    if (typeof report.userId !== 'string') {
        return res.status(400).json({ target: 'userId', message: '변경할 신고의 사용자 ID가 올바르지 않습니다.' });
    }
    if (typeof report.status !== 'string') {
        return res.status(400).json({ target: 'status', message: '변경할 신고 상태가 올바르지 않습니다.' });
    }

    let result = await reportModel.updateDocumentReport(report);
    if (result > 0) {
        return res.status(200).json({ message: '신고 상태를 변경했습니다.' });
    } else if(result === 0){
        return res.status(404).json({ message: '변경할 신고를 찾지 못했습니다.' });
    } else {
        logger.error('게시물 신고 상태변경 중 에러 : ', result, report)
        return res.status(500).json({ message: `신고 상태를 변경하지 못했습니다.[${result.code || ''}]` })
    }
});

router.post('/comment', requiredAuth, async(req, res) => {
    let commentId = req.body.commentId;
    if (typeof commentId === 'string') {
        commentId = 1*commentId
    }
    if (!Number.isInteger(commentId) || commentId === 0) {
        return res.status(400).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
    }
    let reportTypeId = req.body.reportTypeId;
    if (typeof reportTypeId === 'string') {
        reportTypeId = 1*reportTypeId;
    }
    if (!Number.isInteger(reportTypeId) || reportTypeId === 0) {
        return res.status(400).json({ target: 'reportTypeId', message: '신고 구분이 적절하지 않습니다.' })
    }
    const comment = await commentModel.getComment(commentId);
    if (!Array.isArray(comment) || comment.length === 0) {
        return res.status(404).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
    } else if (comment[0].isDeleted) {
        return res.status(403).json({ target: 'commentId', message: '삭제된 댓글은 신고할 수 없습니다.' })
    }
    const document = await documentModel.getDocument(comment[0].documentId);
    if (!Array.isArray(document) || document.length === 0) {
        return res.status(404).json({ target: 'documentId', message: '댓글의 게시물을 찾을 수 없습니다.' });
    } else if (document[0].isDeleted) {
        return res.status(403).json({ target: 'documentId', message: '삭제된 게시물은 신고할 수 없습니다.' })
    }
    const board = await boardModel.getBoard(document[0].boardId);
    if (!Array.isArray(board) || board.length === 0) {
        return res.status(404).json({ taregt: 'boardId', message: '라운지/토픽을 찾을 수 없습니다.' })
    }
    let result = await boardModel.checkUserBoardReadable(req.userObject.userId, document[0].boardId)
    if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
        return res.status(403).json({ target: 'documentId', message: '댓글을 신고할 수 있는 권한이 없습니다.' });
    }
    const report = await reportModel.getReportType(reportTypeId);
    if (!Array.isArray(report) || report.length === 0) {
        return res.status(404).json({ target: 'reportTypeId', message: '신고 구분이 올바르지 않습니다.' })
    }

    result = await reportModel.createCommentReport(req.userObject.userId, commentId, reportTypeId, board[0].boardType === 'T' ? req.userObject.topicNickName : req.userObject.loungeNickName);
    if (result > 0) {
        return res.status(200).json({ message: '신고했습니다.' });
    } else if (typeof result === 'object' && result.code === dbErrorCode.PKDUPLICATION) {
        return res.status(409).json({ message: '이미 신고하셨습니다.' });
    } else {
        logger.error('댓글 신고 중 에러 : ', result, commentId, req.userObject.userId)
        return res.status(500).json({ message: `신고하지 못했습니다.[${result.code || ''}]` })
    }
});

router.put('/comment', adminOnly, async(req, res) => {
    let report = {
        commentId: req.body.commentId,
        userId: req.body.userId,
        status: req.body.status
    }
    if (typeof report.commentId === 'string') {
        report.commentId = 1*report.commentId
    }
    if (!Number.isInteger(report.commentId) || report.commentId === 0) {
        return res.status(400).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
    }
    if (typeof report.userId !== 'string') {
        return res.status(400).json({ target: 'userId', message: '변경할 신고의 사용자 ID가 올바르지 않습니다.' });
    }
    if (typeof report.status !== 'string') {
        return res.status(400).json({ target: 'status', message: '변경할 신고 상태가 올바르지 않습니다.' });
    }

    let result = await reportModel.updateCommentReport(report);
    if (result > 0) {
        return res.status(200).json({ message: '신고 상태를 변경했습니다.' });
    } else if(result === 0){
        return res.status(404).json({ message: '변경할 신고를 찾지 못했습니다.' });
    } else {
        logger.error('댓글 신고 상태 변경 중 에러 : ', result, report)
        return res.status(500).json({ message: `신고 상태를 변경하지 못했습니다.[${result.code || ''}]` })
    }
});

router.get('/document', requiredAuth, async(req, res) => {
    let documentId = req.query.documentId;
    if (typeof documentId === 'string') {
        documentId = 1*documentId
    }
    if (!Number.isInteger(documentId) || documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }

    let result = await reportModel.getDocumentReports(documentId, 'NORMAL', 1); //NORMAL, 1page default
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('게시물 신고 조회 중 에러 : ', result, documentId, req.userObject.userId)
        return res.status(500).json({ message: `신고내역을 조회하지 못했습니다.[${result.code || ''}]` })
    }
});

router.get('/comment', requiredAuth, async(req, res) => {
    let commentId = req.query.commentId;
    if (typeof commentId === 'string') {
        commentId = 1*commentId
    }
    if (!Number.isInteger(commentId) || commentId === 0) {
        return res.status(400).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
    }
    const comment = await commentModel.getComment(commentId);
    if (!Array.isArray(comment) || comment.length === 0) {
        return res.status(404).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
    } else if (comment[0].isDeleted) {
        return res.status(403).json({ target: 'commentId', message: '삭제된 댓글입니다.' })
    }

    let result = await reportModel.getCommentReports(commentId, 'NORMAL', 1); //NORMAL, 1page default
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('댓글 신고 조회 중 에러 : ', result, commentId, req.userObject.userId)
        return res.status(500).json({ message: `신고내역을 조회하지 못했습니다.[${result.code || ''}]` })
    }
});

router.get('/document/list', adminOnly, async(req, res) => {
    let documentId = req.query.documentId;
    if (typeof documentId === 'string') {
        documentId = 1*documentId
    }
    if (documentId !== undefined && (!Number.isInteger(documentId) || documentId === 0)) {
        return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
    let status = req.body.status;
    if (![undefined, 'NORMAL', 'DELETED'].includes(status)) {
        return res.status(400).json({ target: 'status', message: '조회할 신고 상태값이 올바르지 않습니다.' })
    }
    let userId = req.body.userId;
    if (userId !== undefined && typeof userId !== 'string') {
        return res.status(400).json({ target: 'userId', message: '조회할 신고의 사용자 ID가 올바르지 않습니다.' });
    }
    let page = req.body.page;
    if (typeof page === 'string') {
        page = 1*page;
    }
    if (!Number.isInteger(page) && page < 1) {
        page = 1;
    }

    let result = await reportModel.getDocumentReportsAdmin(documentId, userId, status, page);
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('게시물 신고 조회 중 에러 : ', result, documentId, status, userId, page)
        return res.status(500).json({ message: `신고내역을 조회하지 못했습니다.[${result.code || ''}]` })
    }
});

router.get('/comment/list', adminOnly, async(req, res) => {
    let commentId = req.query.commentId;
    if (typeof commentId === 'string') {
        commentId = 1*commentId
    }
    if (commentId !== undefined && (!Number.isInteger(commentId) || commentId === 0)) {
        return res.status(400).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
    }
    let status = req.body.status;
    if (![undefined, 'NORMAL', 'DELETED'].includes(status)) {
        return res.status(400).json({ target: 'status', message: '조회할 신고 상태값이 올바르지 않습니다.' })
    }
    let userId = req.body.userId;
    if (userId !== undefined && typeof userId !== 'string') {
        return res.status(400).json({ target: 'userId', message: '조회할 신고의 사용자 ID가 올바르지 않습니다.' });
    }
    let page = req.body.page;
    if (typeof page === 'string') {
        page = 1*page;
    }
    if (!Number.isInteger(page) && page < 1) {
        page = 1;
    }

    let result = await reportModel.getCommentReportsAdmin(commentId, userId, status, page);
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('댓글 신고 조회 중 에러 : ', result, commentId, status, userId, page)
        return res.status(500).json({ message: `신고내역을 조회하지 못했습니다.[${result.code || ''}]` })
    }
});

router.get('/type', requiredSignin, async(req, res) => {
    let reportTypeId = req.query.reportTypeId;
    if (reportTypeId !== undefined && typeof reportTypeId === 'string') {
        reportTypeId = 1*reportTypeId
    }
    if (reportTypeId !== undefined && (!Number.isInteger(reportTypeId) || reportTypeId === 0)) {
        return res.status(400).json({ target: 'reportTypeId', message: '신고 종류 값이 올바르지 않습니다.' })
    }
    let result = await reportModel.getReportType(reportTypeId);
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('신고 종류 불러오기 에러 : ', result);
        return res.status(500).json({ message: `신고 종류를 불러오는 데 실패하였습니다.[${result.code || ''}]` })
    }
})
router.post('/type', adminOnly, async(req, res) => {
    let reportType = {
        reportTypeName: req.body.reportTypeName,
        reportTypeDescription: req.body.reportTypeDescription
    }
    if (typeof reportType.reportTypeName !== 'string' || reportType.reportTypeName.length > 50) {
        return res.status(400).json({ target: 'reportTypeName', message: '신고 종류 이름이 50자를 넘거나 형태가 올바르지 않습니다.' })
    }
    if (typeof reportType.reportTypeDescription !== 'string' || reportType.reportTypeDescription.length > 100) {
        return res.status(400).json({ target: 'reportTypeDescription', message: '신고 종류 설명이 100자를 넘거나 형태가 올바르지 않습니다.' })
    }

    let result = await reportModel.createReportType(reportType);
    if (result.rowCount > 0 && result.rows && result.rows[0] && result.rows[0].reportTypeId > 0) {
        return res.status(200).json({ message: '신고 종류를 만들었습니다.', reportTypeId: result.rows[0].reportTypeId })
    } else if (result.code) {
        logger.error('신고 종류 생성 시 에러 : ', result, reportType);
        return res.status(500).json({ message: `신고 종류를 만들지 못했습니다.[${result.code || ''}]` })
    } else {
        logger.error('신고 종류 생성 시 에러(2) : ', result, reportType);
        return res.status(500).json({ message: '신고 종류를 만들지 못헀습니다.' });
    }

})
router.put('/type', adminOnly, async(req, res) => {
    let reportType = {
        reportTypeId: req.body.reportTypeId,
        reportTypeName: req.body.reportTypeName,
        reportTypeDescription: req.body.reportTypeDescription
    }
    if (typeof reportType.reportTypeId === 'string') {
        reportType.reportTypeId = 1*reportType.reportTypeId
    }
    if (!Number.isInteger(reportType.reportTypeId) || reportType.reportTypeId === 0) {
        return res.status(400).json({ target: 'reportTypeId', message: '신고 종류 값이 올바르지 않습니다.' })
    }
    if (reportType.reportTypeName !== undefined && (typeof reportType.reportTypeName !== 'string' || reportType.reportTypeName.length > 50)) {
        return res.status(400).json({ target: 'reportTypeName', message: '신고 종류 이름이 50자를 넘거나 형태가 올바르지 않습니다.' })
    }
    if (reportType.reportTypeDescription !== undefined && (typeof reportType.reportTypeDescription !== 'string' || reportType.reportTypeDescription.length > 100)) {
        return res.status(400).json({ target: 'reportTypeDescription', message: '신고 종류 설명이 100자를 넘거나 형태가 올바르지 않습니다.' })
    }
    if (reportType.reportTypeName === undefined && reportType.reportTypeDescription === undefined) {
        return res.status(400).json({ message: '변경될 내용이 없습니다.' });
    }

    let result = await reportModel.updateReportType(reportType);
    if (typeof result === 'number') {
        if (result > 0) {
            return res.status(200).json({ message: '신고 종류를 변경했습니다.' })
        } else {
            return res.status(404).json({ message: '신고 종류를 찾을 수 없습니다.' })
        }
    } else {
        logger.error('신고 종류 변경 시 에러 : ', result, reportType);
        return res.status(500).json({ message: `신고 종류를 변경하지 못했습니다.[${result.code || ''}]` })
    }
})
router.delete('/type/:reportTypeId([0-9]+)', adminOnly, async(req, res) => {
    let reportTypeId = req.params.reportTypeId;
    if (typeof reportTypeId === 'string') {
        reportTypeId = 1*reportTypeId;
    }
    if (!Number.isInteger(reportTypeId) || reportTypeId === 0) {
        return res.status(400).json({ target: 'reportTypeId', message: '삭제할 신고종류 ID가 올바르지 않습니다.' });
    }
    let result = await reportModel.deleteReportType(reportTypeId);
    if (typeof result === 'object') {
        logger.error('신고종류 삭제 중 에러 : ', result, req.userObject.userId, reportTypeId)
        return res.status(500).json({ message: `신고 종류를 삭제하던 중 오류가 발생했습니다.[${result.code || ''}]` });
    }else if(result === 0){
        return res.status(404).json({ target:'reportTypeId', message: '삭제할 신고 종류가 없습니다.' });
    } else {
        return res.status(200).json({ message: '신고 종류를 삭제하였습니다.' });
    }
})

module.exports = router;
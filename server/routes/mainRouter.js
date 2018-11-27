const router = require('express').Router();
const visitorOnly = require('../middlewares/visitorOnly'),
    requiredSignin = require('../middlewares/requiredSignin'),
    requiredAuth = require('../middlewares/requiredAuth'),
    { reserved, boardTypeDomain } = require('../constants'),
    logger = require('../logger');
const documentModel = require('../models/documentModel'),
    userModel = require('../models/userModel'),
    boardModel = require('../models/boardModel');

router.get('/index', visitorOnly('/'), (req, res) => {
    res.status(501).end();
});

router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/profile', requiredSignin, async(req, res) => {
    let nickName = req.query.nickName;
    if (typeof nickName !== 'string') {
        return res.status(400).json({ target: 'nickName', message: '닉네임이 올바르지 않습니다.' })
    }
    let result = await userModel.getProfile(nickName);
    if (result.userId) {
        delete result.userId;
        return res.status(200).json(result);
    } else if (result === {}) {
        return res.status(404).json({ target: 'nickName', message: '사용자를 찾을 수 없습니다.' })
    } else {
        logger.error('프로필 조회 중 에러 : ', result, nickName);
        return res.status(500).json({ message: `프로필을 조회하지 못했습니다.[${result.code || ''}]` })
    }
});

router.get('/:boardId([a-zA-Z]+)', requiredAuth, async(req, res, next) => {
    let boardId = req.params.boardId
    if (boardId === 'loungeBest' || boardId === 'topicBest') {
        let page = req.query.page,
            documentId = req.query.documentId,
            searchQuery = req.query.searchQuery,
            searchTarget = req.query.searchTarget;
        if (typeof page === 'string') {
            page = Number(page)
        }
        if (page === undefined || !Number.isInteger(page) || page < 1) {
            page = 1;
        }
        if (typeof documentId === 'string') {
            documentId = Number(documentId);
        }
        if (documentId !== undefined && (!Number.isInteger(documentId) || documentId === 0)) {
            documentId = undefined;
        }
        if (typeof searchQuery !== 'string' || !['title', 'contents', 'titleContents'].includes(searchTarget)) {
            searchQuery = undefined;
            searchTarget = undefined;
        }

        let result = await documentModel.getBestDocuments(documentId, boardId === 'loungeBest' ? 'L' : 'T', searchQuery, searchTarget, page);
        if (Array.isArray(result)) {
            return res.status(200).json(result);
        } else {
            logger.error('베스트게시물 목록 조회 중 에러 : ', result, boardId, page, sortTarget, documentId, searchTarget)
            return res.status(500).json({ message: `게시물 목록을 조회하지 못했습니다.[${result.code || ''}]` })
        }
    } else if (typeof boardId === 'number' || reserved.includes(boardId)) {
        next();
        return;
    } else if (typeof boardId === 'string') { //find board
        let board = await boardModel.getBoard(boardId);
        if (Array.isArray(board) && board.length > 0) {
            board = board[0];
            let result = await boardModel.checkUserBoardReadable(req.uesrObject.userId, boardId);
            if (Array.isArray(result) && result.length > 0 && result[0].count > 0) { //readable
                let page = req.query.page,
                    sortTarget = req.query.sortTarget,
                    documentId = req.query.documentId,
                    searchQuery = req.query.searchQuery,
                    searchTarget = req.query.searchTarget,
                    isAscending = req.query.isAscending;
                if (typeof page === 'string') {
                    page = Number(page)
                }
                if (page === undefined || !Number.isInteger(page) || page < 1) {
                    page = 1;
                }
                if (!['viewCount', 'voteCount', 'writeDateTime'].includes(sortTarget)) {
                    sortTarget = undefined;
                }
                if (typeof documentId === 'string') {
                    documentId = Number(documentId);
                }
                if (documentId !== undefined && (!Number.isInteger(documentId) || documentId === 0)) {
                    documentId = undefined;
                }
                if (typeof isAscending !== 'boolean') {
                    isAscending = false;
                }
                if (typeof searchQuery !== 'string' || !['title', 'contents', 'titleContents'].includes(searchTarget)) {
                    searchQuery = undefined;
                    searchTarget = undefined;
                }

                let result = await documentModel.getDocuments(boardId, documentId, searchQuery, searchTarget, sortTarget, isAscending, page, req.userObject.isAdmin);
                if (Array.isArray(result)) {
                    return res.status(200).json(result);
                } else {
                    logger.error('게시물 목록 조회 중 에러 : ', result, boardId, page, sortTarget, documentId, searchQuery, searchTarget, isAscending)
                    return res.status(500).json({ message: `게시물 목록을 조회하지 못했습니다.[${result.code || ''}]` })
                }
            } else {
                return res.status(403).json({ target: 'boardId', message: `${boardTypeDomain[board[0].boardType]}의 게시물을 볼 수 있는 권한이 없습니다.` })
            }
        }
    }
    next();
    return;
});

const getDocument = async(req, res) => {
    let documentId = req.params.documentId;
    let result = await documentModel.getDocument(documentId);
    if (Array.isArray(result) && result.length > 0) {
        const board = await boardModel.getBoard(result[0].boardId);
        if (Array.isArray(board) && board.length > 0 && board[0].status === 'NORMAL') {
            if (board[0].allGroupAuth === 'NONE') {
                const check = await boardModel.checkUserBoardReadable(req.userObject.userId, result[0].boardId);
                if (!Array.isArray(check) || check.length === 0 || check[0].count === 0) {
                    return res.status(403).json({ target: 'documentId', message: '게시물을 읽을 수 있는 권한이 없습니다.' })
                }
            }
            let view = await documentModel.createDocumentViewLog(documentId, req.userObject.userId);
            if (view && view.rows && view.rows.length > 0 && view.rows[0].viewCount > 0) {
                result[0].viewCount = view.rows[0].viewCount;
            }
            if (result[0].hasSurvey) {
                let survey = await documentModel.getDocumentSurvey(documentId);
                if (Array.isArray(survey) && survey.length > 0) {
                    delete survey[0].documentId;
                    result[0].survey = survey[0];
                    let check = await documentModel.getDocumentSurveyHistory(documentId, req.userObject.userId);
                    if (Array.isArray(check) && check.length > 0 && check[0].count > 0) {
                        result[0].participatedSurvey = true;
                    }
                }
            }
            if (result[0].hasAttach) {
                const attach = await documentModel.getDocumentAttach(documentId);
                if (Array.isArray(attach) && attach.length > 0) {
                    result[0].attach = attach;
                }
            }
            if ((result[0].userId === req.userObject.userId) || req.userObject.isAdmin) {
                result[0].isWriter = true;
            }
            delete result[0].userId;
            return res.status(200).json(result[0]);
        } else {
            return res.status(404).json({ target: 'documentId', message: `삭제된 ${boardTypeDomain[baord[0].boardType]}입니다.` });
        }
    } else {
        return res.status(404).json({ target: 'documentId', message: '존재하지 않는 게시물입니다.' })
    }
}

router.get('/:boardId([a-zA-Z]+)/:documentId(^[\\d]+$)', requiredAuth, async(req, res, next) => {
    console.log('/:boardId/:documentId targeted');
    if (typeof req.params.boardId === 'number' || reserved.includes(req.params.boardId)) {
        next();
        return;
    }
    let documentId = req.params.documentId;
    if (!Number.isInteger(documentId)) {
        documentId = Number(documentId);
        if (isNaN(documentId) || documentId === 0) {
            next();
            return;
        }
    }
    return await getDocument(req, res);
});

router.get(/\/(\d+)(?:\/.*|\?.*)?$/, requiredAuth, async(req, res, next) => {
    let documentId = req.params[0];
    console.log('/:documentId targeted', documentId);
    if (!Number.isInteger(documentId)) {
        documentId = Number(documentId);
        if (isNaN(documentId) || documentId === 0) {
            next();
            return;
        }
    }
    req.params.documentId = documentId;
    return await getDocument(req, res);
});

router.post('/survey', requiredAuth, async(req, res) => {
    let survey = { documentId: req.body.documentId, answer: req.body.answer }
    if (typeof survey.documentId === 'string') {
        survey.documentId = Number(survey.documentId)
    }
    if (!Number.isInteger(survey.documentId) || survey.documentId === 0) {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
    let document = await documentModel.getDocument(survey.documentId);
    if (!Array.isArray(document) || document.length === 0) {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    } else if (document[0].isDeleted) {
        return res.status(403).json({ target: 'documentId', message: '삭제된 게시물입니다.' })
    } else if (!document[0].hasSurvey) {
        return res.status(400).json({ target: 'documentId', message: '설문조사가 없는 게시물입니다.' })
    }
    let check = await boardModel.checkUserBoardReadable(req.userObject.userId, document[0].boardId)
    if (!Array.isArray(check) || check[0].count === 0) {
        return res.status(403).json({ target: 'documentId', message: '게시물을 읽을 수 있는 권한이 없습니다.' });
    }
    check = await documentModel.createDocumentSurveyHistory(survey.documentId, req.userObject.userId, survey.answer);
    if (check > 0) {
        let original = await documentModel.getDocumentSurvey(survey.documentId);
        if (!Array.isArray(original) || original.length === 0) {
            await documentModel.deleteDocumentSurveyHistory(survey.documentId, req.userObject.userId)
            return res.status(404).json({ target: 'documentId', message: '설문조사가 없는 게시물입니다.' })
        }
        //TODO : reflect user's answer into survey answer summary
        check = await documentModel.updateDocumentSurvey(survey.documentId, original.surveyAnswers);
        if (typeof check === 'object' || check === 0) {
            await documentModel.deleteDocumentSurveyHistory(survey.documentId, req.userObject.userId)
            logger.error('설문 내용 제출 중 에러 : ', check, req.userObject.userId, survey.answer)
            return res.status(500).json({ message: `설문 응답을 저장하는 데 실패하였습니다.[${check.code}]` })
        } else {
            return res.status(200).json({ message: '설문 내용을 저장하였습니다.' });
        }
    } else {
        return res.status(409).json({ target: 'answer', message: '이미 참여한 설문입니다.' });
    }
});

router.get('/notification', requiredSignin, async(req, res) => {

});
module.exports = router;
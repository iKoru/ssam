const router = require('express').Router();
const visitorOnly = require('../middlewares/visitorOnly'),
    requiredSignin = require('../middlewares/requiredSignin'),
    requiredAuth = require('../middlewares/requiredAuth'),
    { reserved, boardTypeDomain } = require('../constants');
const documentModel = require('../models/documentModel'),
    boardModel = require('../models/boardModel');

router.get('/index', visitorOnly('/'), (req, res) => {
    res.status(501).end();
});

router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/profile', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/:boardId([a-zA-Z]+)', requiredAuth, (req, res, next) => {
    if (req.params.boardId === 'loungeBest' || req.params.boardId === 'topicBest') {

    } else if (typeof req.params.boardId === 'number' || reserved.includes(req.params.boardId)) {
        next();
        return;
    } else {

    }
    console.log(req.route);
    console.log('/:boardId targeted', req.params.boardId)
    next(); //temporary 
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

router.get('/:boardId([a-zA-Z]+)/:documentId(^[\\d]+$)', requiredAuth, (req, res, next) => {
    if (typeof req.params.boardId === 'number' || reserved.includes(req.params.boardId)) {
        next();
        return;
    }
    let documentId = req.params.documentId;
    if (!Number.isInteger(documentId)) {
        documentId = parseInt(documentId);
        if (isNaN(documentId)) {
            next();
            return;
        }
    }
    return getDocument(req, res);
});

router.get('/:documentId(^[\\d]+$)', requiredAuth, (req, res, next) => {
    let documentId = req.params.documentId;
    if (!Number.isInteger(documentId)) {
        documentId = parseInt(documentId);
        if (isNaN(documentId)) {
            next();
            return;
        }
    }
    return getDocument(req, res);
});

router.post('/survey', requiredAuth, (req, res) => {
    let survey = { documentId: req.body.documentId, answer: req.body.answer }
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
            return res.status(500).json({ message: `설문 응답을 저장하는 데 실패하였습니다.[${check.code}]` })
        } else {
            return res.status(200).json({ message: '설문 내용을 저장하였습니다.' });
        }
    } else {
        return res.status(409).json({ target: 'answer', message: '이미 참여한 설문입니다.' });
    }
});

router.get('/notification', requiredSignin, (req, res) => {
    res.status(501).end();
});
module.exports = router;
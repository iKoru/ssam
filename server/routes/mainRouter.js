const router = require('express').Router();
const visitorOnly = require('../middlewares/visitorOnly'),
    requiredSignin = require('../middlewares/requiredSignin'),
    { isNumeric } = require('../util'),
    { reserved } = require('../constants');
const documentModel = require('../models/documentModel');

router.get('/index', visitorOnly('/'), (req, res) => {
    res.status(501).end();
});

router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/profile', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/:boardId([a-zA-Z]+)', requiredSignin, (req, res, next) => {
    if (req.params.boardId === 'loungeBest' || req.params.boardId === 'topicBest') {

    } else if (isNumeric(req.params.boardId) || reserved.includes(req.params.boardId)) {
        next();
        return;
    } else {

    }
    console.log(req.route);
    console.log('/:boardId targeted', req.params.boardId)
    next(); //temporary 
});

router.get('/:boardId([a-zA-Z]+)/:documentId(^[\\d]+$)', requiredSignin, (req, res, next) => {
    if (isNumeric(req.params.boardId) || reserved.includes(req.params.boardId)) {
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
    let result = await documentModel.getDocument(documentId);
    if (Array.isArray(result) && result.length > 0) {
        if (result[0].survey) {
            //let survey = await documentModel.getDocumentSurvey(documentId);
            //TODO : survey handling. get survey status && the current user has taken part of this survey or not
        }
        return res.status(200).json(result[0]);
    } else {
        return res.status(404).json({ target: 'documentId', message: '존재하지 않는 게시물입니다.' })
    }
});

router.get('/:documentId(^[\\d]+$)', requiredSignin, (req, res, next) => {
    let documentId = req.params.documentId;
    if (!Number.isInteger(documentId)) {
        documentId = parseInt(documentId);
        if (isNaN(documentId)) {
            next();
            return;
        }
    }
    let result = await documentModel.getDocument(documentId);
    if (Array.isArray(result) && result.length > 0) {
        return res.status(200).json(result[0]);
    } else {
        return res.status(404).json({ target: 'documentId', message: '존재하지 않는 게시물입니다.' })
    }
});

router.post('/survey', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/notification', requiredSignin, (req, res) => {
    res.status(501).end();
});
module.exports = router;
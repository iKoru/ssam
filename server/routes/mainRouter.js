const router = require('express').Router();
const visitorOnly = require('../middlewares/visitorOnly'),
    requiredSignin = require('../middlewares/requiredSignin');

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
    if (isNumeric(req.params.boardId) || reserved.includes(req.params.boardId)) {
        next();
    }
    res.status(501).end();
});

router.get('/:boardId([a-zA-Z]+)/:documentId(^[\\d]+$)', requiredSignin, (req, res, next) => {
    if (reserved.includes(req.params.boardId)) {
        next();
    }
    res.status(501).end();
});

router.get('/:documentId(^[\\d]+$)', requiredSignin, (req, res, next) => {
    res.status(501).end();
});

router.post('/survey', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/notification', requiredSignin, (req, res) => {
    res.status(501).end();
});
module.exports = router;
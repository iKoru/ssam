const router = require('express').Router();
const visitorOnly = require('../middlewares/visitorOnly'),
    requiredSignin = require('../middlewares/requiredSignin'),
    {isNumeric} = require('../util'),
    {reserved} = require('../constants');

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
        return;
    }
    console.log(req.route);
    console.log('/:boardId targeted', req.params.boardId)
    next();//temporary 
    return;
    res.status(501).end();
});

router.get('/:boardId([a-zA-Z]+)/:documentId(^[\\d]+$)', requiredSignin, (req, res, next) => {
    if (reserved.includes(req.params.boardId)) {
        next();
        return;
    }
    console.log('/:boardId/:documentId targeted');
    res.status(501).end();
});

router.get('/:documentId(^[\\d]+$)', requiredSignin, (req, res, next) => {
    console.log('/:documentId targeted');
    res.status(501).end();
});

router.post('/survey', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/notification', requiredSignin, (req, res) => {
    res.status(501).end();
});
module.exports = router;
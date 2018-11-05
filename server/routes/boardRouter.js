const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin'),
    adminOnly = require('../middlewares/adminOnly');
const { reserved } = require('../constants');
const { isNumeric } = require('../util');
//based on /board


router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.put('/', requiredSignin, (req, res) => {
    res.status(501).end();
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
module.exports = router;
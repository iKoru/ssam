const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
//based on /comment

router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.post('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.put('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.delete('/:commentId(^[\\d]+$)', requiredSignin, (req, res) => {
    res.status(501).end();
});
module.exports = router;
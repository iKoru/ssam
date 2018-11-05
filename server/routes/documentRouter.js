const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
//based on /document

router.post('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.put('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.delete('/:documentId(^[\\d]+$)', requiredSignin, (req, res) => {
    res.status(501).end();
});
module.exports = router;
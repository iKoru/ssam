const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
//based on /scrap

router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});
router.get('/:scrapGroupId(^[\\d+]+$)', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.post('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.delete('/:scrapGroupId(^[\\d+]+$)/:documentId(^[\\d]+$)', requiredSignin, (req, res) => {
    res.status(501).end();
});
module.exports = router;
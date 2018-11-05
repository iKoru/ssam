const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly'),
    requiredSignin = require('../middlewares/requiredSignin');
//based on /vote
router.post('/document', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.post('/comment', requiredSignin, (req, res) => {
    res.status(501).end();
});

module.exports = router;
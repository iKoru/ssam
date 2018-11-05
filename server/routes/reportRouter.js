const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly'),
    requiredSignin = require('../middlewares/requiredSignin');
//based on /report
router.post('/document', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.put('/document', adminOnly, (req, res) => {
    res.status(501).end();
});

router.post('/comment', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.put('/comment', adminOnly, (req, res) => {
    res.status(501).end();
});

router.get('/document', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/comment', requiredSignin, (req, res) => {
    res.status(501).end();
});

module.exports = router;
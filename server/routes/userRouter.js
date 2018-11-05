const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly'),
    requiredSignin = require('../middlewares/requiredSignin');
//based on /user
router.put('/', adminOnly, (req, res) => {
    res.status(501).end();
});

router.put('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.post('/', (req, res) => { //회원가입
    res.status(501).end();
});

router.get('/list', adminOnly, (req, res) => {
    res.status(501).end();
});

router.delete('/:userId', adminOnly, (req, res) => {
    res.status(501).end();
});

router.get('/document', requiredSignin, (req, ers) => {
    res.status(501).end();
});

router.get('/comment', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/board', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.put('/board', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.put('/group', adminOnly, (req, res) => {
    res.status(501).end();
});
module.exports = router;
const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly');
//based on /group
router.get('/list', adminOnly, (req, res) => {
    res.status(501).end();
});

router.get('/', adminOnly, (req, res) => {
    res.status(501).end();
});

router.post('/', adminOnly, (req, res) => {
    res.status(501).end();
});

router.put('/', adminOnly, (req, res) => {
    res.status(501).end();
});

router.delete('/:groupId', adminOnly, (req, res) => {
    res.status(501).end();
});
module.exports = router;
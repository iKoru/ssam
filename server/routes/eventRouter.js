const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin'),
    adminOnly = require('../middlewares/adminOnly');
//based on /event

router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});
router.get('/list', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.post('/', adminOnly, (req, res) => {
    res.status(501).end();
});

router.put('/', adminOnly, (req, res) => {
    res.status(501).end();
});

router.delete('/:eventId(^[\\d]+$)', adminOnly, (req, res) => {
    res.status(501).end();
});
module.exports = router;
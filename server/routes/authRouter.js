const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
//based on /auth
router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.post('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

module.exports = router;
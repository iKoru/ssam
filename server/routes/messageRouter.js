const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
//based on /message

router.get('/list', requiredSignin, (req, res) => {
    res.status(501).end();
});
router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.post('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.delete('/:chatId', requiredSignin, (req, res) => {
    res.status(501).end();
})
module.exports = router;
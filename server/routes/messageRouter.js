const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
//based on /message

router.get('/list', requiredSignin, (req, res) => {
    
});
router.get('/', requiredSignin, (req, res) => {
    
});

router.post('/', requiredSignin, (req, res) => {
    
});

module.exports = router;
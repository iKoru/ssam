const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
//based on /comment

router.get('/', requiredSignin, (req, res) => {
    
});

router.post('/', requiredSignin, (req, res) => {
    
});

router.put('/', requiredSignin, (req, res) => {
    
});

router.delete('/:commentId(^[\\d]+$)', requiredSignin, (req, res) => {
    
});
module.exports = router;
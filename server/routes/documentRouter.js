const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
//based on /document

router.post('/', requiredSignin, (req, res) => {
    
});

router.put('/', requiredSignin, (req, res) => {
    
});

router.delete('/:documentId(^[\\d]+$)', requiredSignin, (req, res) => {
    
});
module.exports = router;
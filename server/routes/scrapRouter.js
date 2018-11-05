const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin');
//based on /scrap

router.get('/', requiredSignin, (req, res) => {
    
});

router.post('/', requiredSignin, (req, res) => {
    
});

router.delete('/:scrapGroupId(^[\\d+]+$)/:documentId(^[\\d]+$)', requiredSignin, (req, res) => {
    
});
module.exports = router;
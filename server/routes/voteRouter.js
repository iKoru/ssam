const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly'),
    requiredSignin = require('../middlewares/requiredSignin');
//based on /vote
router.post('/document', requiredSignin, (req, res) => {
    
});

router.post('/comment', requiredSignin, (req, res) => {
    
});

module.exports = router;
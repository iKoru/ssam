const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly'),
    requiredSignin = require('../middlewares/requiredSignin');
//based on /report
router.post('/document', requiredSignin, (req, res) => {
    
});

router.put('/document', adminOnly, (req, res) => {
    
});

router.post('/comment', requiredSignin, (req, res) => {
    
});

router.put('/comment', adminOnly, (req, res) => {
    
});

router.get('/document', requiredSignin, (req, res) => {
    
});

router.get('/comment', requiredSignin, (req, res) => {
    
});

module.exports = router;
const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin'),
    adminOnly = require('../middlewares/adminOnly');
//based on /event

router.get('/', requiredSignin, (req, res) => {
    
});
router.get('/list', requiredSignin, (req, res) => {
    
});

router.post('/', adminOnly, (req, res) => {
    
});

router.put('/', adminOnly, (req, res) => {
    
});

router.delete('/:eventId(^[\\d]+$)', adminOnly, (req, res) => {
    
});
module.exports = router;
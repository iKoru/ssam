const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin'),
    adminOnly = require('../middlewares/adminOnly');
const {reserved} = require('../constants');
const {isNumeric} = require('../util');
//based on /board


router.get('/', requiredSignin, (req, res) => {
    
});

router.put('/', requiredSignin, (req, res) => {
    
});

router.post('/', requiredSignin, (req, res) => {
    
});

router.delete('/:boardId([a-zA-z]+)', requiredSignin, (req, res) => {
    
});

router.get('/list', requiredSignin, (req, res) => {
    
});
module.exports = router;
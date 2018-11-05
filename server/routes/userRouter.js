const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly'),
  requiredSignin = require('../middlewares/requiredSignin');
//based on /user
router.put('/', requiredSignin, (req, res) => {
  res.status(200).end();
});

router.post('/', (req, res) => {//회원가입

});

router.get('/list', adminOnly, (req, res)=> {
    
});

router.delete('/:userId', adminOnly, (req, res)=> {
  res.status(200).end();
});

router.get('/document', requiredSignin, (req, ers) => {
  
});

router.get('/comment', requiredSignin, (req, res) => {
  
});

router.get('/board', requiredSignin, (req, res)=> {
  
});

router.put('/board', requiredSignin, (req, res)=> {
  
});

router.put('/group', adminOnly, (req, res)=> {
  
});
module.exports = router;
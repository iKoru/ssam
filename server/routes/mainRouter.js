const router = require('express').Router();
const visitorOnly = require('../middlewares/visitorOnly'),
  requiredSignin = require('../middlewares/requiredSignin');

router.get('/index', visitorOnly('/'), (req, res) => {
  res.status(200).end();
});

router.get('/', requiredSignin, (req, res) => {
  res.status(200).end();
});

router.get('/profile', requiredSignin, (req, res) => {
  
});

router.get('/:boardId([a-zA-Z]+)', requiredSignin, (req, res, next) => {
   if(isNumeric(req.params.boardId) || reserved.includes(req.params.boardId)){
       next();
   }
});

router.get('/:boardId([a-zA-Z]+)/:documentId(^[\\d]+$)', requiredSignin, (req, res, next) => {
   if(reserved.includes(req.params.boardId)){
       next();
   } 
});

router.get('/:documentId(^[\\d]+$)', requiredSignin, (req, res, next) => {
    
});

router.post('/survey', requiredSignin, (req, res) => {
    
});

router.get('/notification', requiredSignin, (req, res) => {
    
});
module.exports = router;
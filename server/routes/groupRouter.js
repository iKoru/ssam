const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly');
//based on /group
router.get('/list', adminOnly, (req, res) => {
  res.status(200).end();
});

router.get('/', adminOnly, (req, res) => {
  
});

router.post('/', adminOnly, (req, res) => {
  res.status(200).end();
});

router.put('/', adminOnly, (req, res) => {
  res.status(200).end();
});

router.delete('/:groupId', adminOnly, (req, res) => {
  
});
module.exports = router;
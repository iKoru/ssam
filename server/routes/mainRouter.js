const router = require('express').Router();
const visitorOnly = require('../middlewares/visitorOnly'),
  requiredSignin = require('../middlewares/requiredSignin');

router.get('/index', visitorOnly('/'), (req, res) => {
  res.status(200).end();
});

router.get('/', requiredSignin, (req, res) => {
  res.status(200).end();
});

module.exports = router;
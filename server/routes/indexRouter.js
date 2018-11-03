const jwt = require('jsonwebtoken');
const config = require('../../config');

export default function (router){
    router.post('/signin', function(req, res){
      let userId = req.body.userId;
      let password = req.body.password;
      if(userId === 'test' || password === 'xptmxm1!'){
        res.json(jwt.sign({userId:userId}, config.jwtKey, config.jwtOptions));
      }else{
        res.status(400).json({message:'잘못된 접근입니다.'});
      }
    });
    
    router.get('/user', function(req, res){
      let token = req.headers['x-auth'];
      let user = jwt.verify(token, config.jwtKey, config.jwtOptions);
      if(user){
        res.json({status: "NORMAL", ...user});
      }else{
        res.status(400);
      }
    });
    
}

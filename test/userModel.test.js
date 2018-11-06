const userModel = require('../server/models/userModel');
const config = require('../config');
const bcrypt = require('bcrypt');
test('check user Id if already exists', async () => {
   expect(await userModel.checkUserId('test')).toEqual([{count:0}]); 
});

test('check nickname if already exists', async () => {
   expect(await userModel.checkNickName('test')).toEqual([{count:0}]); 
});

test('check email if already exists', async () => {
   expect(await userModel.checkEmail('test@test.com')).toEqual([{count:0}]); 
});

test('insert user test', async() => {
   const hash = await bcrypt.hash('xptmxm1!', 10);
   expect(await userModel.createUser({
       userId: 'orange2',
       email:'orange2@ssam.com',
       password: hash,
       inviter: null
   })).toEqual(1);
});

test('delete user test', async() => {
   expect(await userModel.deleteUser('orange2')).toEqual(1); 
});
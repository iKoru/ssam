/* global expect */
const userModel = require('../server/models/userModel');
const bcrypt = require('bcrypt');
const util = require('../server/util');
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
   let user = await userModel.getUser('orange2');
   expect(user).toHaveLength(1);
   user = (await userModel.getUser('orange'))[0];
   expect(user.invitedCount).toEqual(1);
});

test('delete user test', async() => {
   expect(await userModel.deleteUser('orange2')).toEqual(1); 
});

test('update user admin test', async() => {
   expect(await userModel.updateUserAdmin({userId:'orange', isAdmin:true})).toEqual(1);
   let user = await userModel.getUser('orange');
   expect(user).toHaveLength(1);
   expect(user[0]).toHaveProperty('isAdmin', true);
   expect(await userModel.updateUserAdmin({userId:'orange', isAdmin:false})).toEqual(1);
   user = await userModel.getUser('orange');
   expect(user[0]).toHaveProperty('isAdmin', false);
});

test('updateUserPassword', async() => {
   const raw = 'xptmxm2@',
      hash = await bcrypt.hash(raw, 10);
   expect(await userModel.updateUserPassword({userId:'orange', password:hash})).toEqual(1);
   let user = (await userModel.getUser('orange'))[0];
   expect(await bcrypt.compare(raw, user.password)).toEqual(true);
   expect(user.passwordChangeDate).toEqual(util.getYYYYMMDD());
   //check for not updating if there is no password passed
   expect(await userModel.updateUserPassword({userId:'orange'})).toEqual(1);
   user = (await userModel.getUser('orange'))[0];
   expect(await bcrypt.compare(raw, user.password)).toEqual(true);
});

test('select users', async() => {
   expect(await userModel.getUsers()).toHaveLength(1);
   expect(await userModel.getUsers('test')).toHaveLength(0);
   expect(await userModel.getUsers('orange')).toHaveLength(1);
   expect(await userModel.getUsers(null, '41f7')).toHaveLength(1);
   expect(await userModel.getUsers(null, null, 'orange@ssam.com')).toHaveLength(1);
   expect(await userModel.getUsers(null, null, 'orange2@ssam.com')).toHaveLength(0);
   expect(await userModel.getUsers(null, null, null, 1)).toHaveLength(0);
   expect(await userModel.getUsers(null, null, null, null, 'BLOCKED')).toHaveLength(0);
   expect(await userModel.getUsers(null, null, null, null, 'NORMAL')).toHaveLength(1);
   expect(await userModel.getUsers(null, null, null, null, null, 'LOUNGE_NICKNAME')).toHaveLength(1);
   expect(await userModel.getUsers(null, null, null, null, null, 'EMAIL')).toHaveLength(1);
   expect(await userModel.getUsers(null, null, null, null, null, 'USER_ID')).toHaveLength(1);
   expect(await userModel.getUsers(null, null, null, null, null, 'PICTURE_PATH', false)).toHaveLength(1);
   expect(await userModel.getUsers(null, null, null, null, null, undefined, false, 2)).toHaveLength(0);
});

test('get profile', async () => {
   expect(await userModel.getProfile('41f7')).toHaveProperty('nickName', '41f7');
   expect(await userModel.getProfile()).toEqual({});
});

test('update user info (except group)', async () => {
   expect(await userModel.updateUserInfo({userId:'orange'})).toBeGreaterThan(0);
   expect(await userModel.updateUserInfo({userId:'orange2'})).toEqual(0);
});
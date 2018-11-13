/* global expect */
const userModel = require('../../server/models/userModel');
const bcrypt = require('bcrypt');
const util = require('../../server/util');

// test('create user - init', async(done) => {
//     let hash = await bcrypt.hash('xptmxm1!', 10);
//     expect(await userModel.createUser({
//         userId: 'orange',
//         email: 'orange@ssam.com',
//         password: hash,
//         inviter: '41f7'
//     })).toEqual(1);
//     hash = await bcrypt.hash('xptmxm1!', 10);
//     expect(await userModel.createUser({
//         userId: 'blue',
//         email: 'blue@ssam.com',
//         password: hash,
//         inviter: '41f7'
//     })).toEqual(1);
//done();
// });

test('check user Id if already exists', async(done) => {
    expect(await userModel.checkUserId('test')).toEqual([{ count: 0 }]);
    expect(await userModel.checkUserId('orange')).toEqual([{ count: 1 }]);
    done();
});

test('check nickname if already exists', async(done) => {
    expect(await userModel.checkNickName('test', 'test')).toEqual([{ count: 0 }]);
    expect(await userModel.checkNickName('orange', '41f7')).toEqual([{ count: 0 }]);
    expect(await userModel.checkNickName('blue', '41f7')).toEqual([{ count: 1 }]);
    done();
});

test('check email if already exists', async(done) => {
    expect(await userModel.checkEmail('test@test.com')).toEqual([{ count: 0 }]);
    expect(await userModel.checkEmail('orange@ssam.com')).toEqual([{ count: 1 }]);
    done();
});

test('insert user test', async(done) => {
    const hash = await bcrypt.hash('xptmxm1!', 10);
    expect(await userModel.createUser({
        userId: 'orange2',
        email: 'orange2@ssam.com',
        password: hash,
        inviter: '41f7'
    })).toEqual(1);
    let user = await userModel.getUser('orange2');
    expect(user).toHaveLength(1);
    user = (await userModel.getUser('orange'))[0];
    expect(user.invitedCount).toBeGreaterThan(0);
    done();
});

test('delete user test', async(done) => {
    expect(await userModel.deleteUser('orange2')).toEqual(1);
    done();
});

test('update user admin test', async(done) => {
    expect(await userModel.updateUserAdmin({ userId: 'orange', isAdmin: true })).toEqual(1);
    let user = await userModel.getUser('orange');
    expect(user).toHaveLength(1);
    expect(user[0]).toHaveProperty('isAdmin', true);
    expect(await userModel.updateUserAdmin({ userId: 'orange', isAdmin: false })).toEqual(1);
    user = await userModel.getUser('orange');
    expect(user[0]).toHaveProperty('isAdmin', false);
    done();
});

test('updateUserPassword', async(done) => {
    const raw = 'xptmxm2@',
        hash = await bcrypt.hash(raw, 10);
    expect(await userModel.updateUserPassword({ userId: 'orange', password: hash })).toEqual(1);
    let user = (await userModel.getUser('orange'))[0];
    expect(await bcrypt.compare(raw, user.password)).toEqual(true);
    expect(user.passwordChangeDate).toEqual(util.getYYYYMMDD());
    //check for not updating if there is no password passed
    expect(await userModel.updateUserPassword({ userId: 'orange' })).toEqual(1);
    user = (await userModel.getUser('orange'))[0];
    expect(await bcrypt.compare(raw, user.password)).toEqual(true);
    done();
});

test('select users', async(done) => {
    expect((await userModel.getUsers()).length).toBeGreaterThan(0);
    expect(await userModel.getUsers('test')).toHaveLength(0);
    expect(await userModel.getUsers('orange')).toHaveLength(1);
    expect(await userModel.getUsers(null, '41f7')).toHaveLength(1);
    expect(await userModel.getUsers(null, null, 'orange@ssam.com')).toHaveLength(1);
    expect(await userModel.getUsers(null, null, 'orange2@ssam.com')).toHaveLength(0);
    expect(await userModel.getUsers(null, null, null, 1)).toHaveLength(0);
    expect(await userModel.getUsers(null, null, null, null, 'BLOCKED')).toHaveLength(0);
    expect((await userModel.getUsers(null, null, null, null, 'NORMAL')).length).toBeGreaterThan(0);
    expect((await userModel.getUsers(null, null, null, null, null, 'LOUNGE_NICKNAME')).length).toBeGreaterThan(0);
    expect((await userModel.getUsers(null, null, null, null, null, 'EMAIL')).length).toBeGreaterThan(0);
    expect((await userModel.getUsers(null, null, null, null, null, 'USER_ID')).length).toBeGreaterThan(0);
    expect((await userModel.getUsers(null, null, null, null, null, 'PICTURE_PATH', false)).length).toBeGreaterThan(0);
    expect(await userModel.getUsers(null, null, null, null, null, undefined, false, 2)).toHaveLength(0);
    done();
});

test('get profile', async(done) => {
    expect(await userModel.getProfile('41f7')).toHaveProperty('nickName', '41f7');
    expect(await userModel.getProfile()).toEqual({});
    done();
});

test('update user info (except group)', async(done) => {
    expect(await userModel.updateUserInfo({ userId: 'orange' })).toBeGreaterThan(0);
    expect(await userModel.updateUserInfo({ userId: 'orange2' })).toEqual(0);
    done();
});
/* global expect */
const userModel = require('../../server/models/userModel');
const bcrypt = require('bcrypt');
const util = require('../../server/util');

// test('create user - init', async (done) => {
//     let hash = await bcrypt.hash('xptmxm1!', 10);
//     expect(await userModel.createUser({
//         userId: 'orange',
//         email: 'orange@sen.go.kr',
//         password: hash,
//         nickName: util.partialUUID() + util.partialUUID(),
//         inviter: '41f7'
//     })).toEqual(1);
//     hash = await bcrypt.hash('xptmxm1!', 10);
//     expect(await userModel.createUser({
//         userId: 'blue',
//         email: 'blue@sen.go.kr',
//         password: hash,
//         nickName: util.partialUUID() + util.partialUUID(),
//         inviter: '41f7'
//     })).toEqual(1);
//     done();
// });

test('check user Id if already exists', async (done) => {
    expect(await userModel.checkUserId('test')).toEqual([{ count: 0 }]);
    expect(await userModel.checkUserId('orange')).toEqual([{ count: 1 }]);
    done();
});

test('check nickname if already exists', async (done) => {
    expect(await userModel.checkNickName('test', 'test')).toEqual([{ count: 0 }]);
    const user = await userModel.getUser('orange');
    expect(user).toHaveLength(1);
    expect(await userModel.checkNickName('orange', user[0].loungeNickName)).toEqual([{ count: 0 }]);
    expect(await userModel.checkNickName('blue', user[0].loungeNickName)).toEqual([{ count: 1 }]);
    done();
});

test('check email if already exists', async (done) => {
    expect(await userModel.checkEmail('test@test.com')).toEqual([{ count: 0 }]);
    expect(await userModel.checkEmail('orange@sen.go.kr')).toEqual([{ count: 1 }]);
    done();
});

test('insert user test', async (done) => {
    const hash = await bcrypt.hash('xptmxm1!', 10);
    let user = await userModel.getUser('orange');
    expect(await userModel.createUser({
        userId: 'orange2',
        email: 'orange2@ssam.com',
        password: hash,
        nickName: util.partialUUID() + util.partialUUID(),
        inviter: user[0].inviteCode
    })).toEqual(1);
    user = await userModel.getUser('orange2');
    expect(user).toHaveLength(1);
    user = (await userModel.getUser('orange'))[0];
    expect(user.invitedCount).toBeGreaterThan(0);
    done();
});

test('delete user test', async (done) => {
    expect(await userModel.deleteUser('orange2')).toEqual(1);
    done();
});

test('update user admin test', async (done) => {
    expect(await userModel.updateUserAdmin({ userId: 'orange', isAdmin: true })).toEqual(1);
    let user = await userModel.getUser('orange');
    expect(user).toHaveLength(1);
    expect(user[0]).toHaveProperty('isAdmin', true);
    expect(await userModel.updateUserAdmin({ userId: 'orange', isAdmin: false })).toEqual(1);
    user = await userModel.getUser('orange');
    expect(user[0]).toHaveProperty('isAdmin', false);
    done();
});

test('updateUserPassword', async (done) => {
    const raw = 'xptmxm2@',
        hash = await bcrypt.hash(raw, 10);
    expect(await userModel.updateUserPassword({ userId: 'orange', password: hash })).toEqual(1);
    let user = (await userModel.getUser('orange'))[0];
    expect(await bcrypt.compare(raw, user.password)).toEqual(true);
    expect(user.passwordChangeDate).toEqual(util.getYYYYMMDD());
    //check for not updating if there is no password passed
    expect(await userModel.updateUserPassword({ userId: 'orange' })).toEqual(0);
    user = (await userModel.getUser('orange'))[0];
    expect(await bcrypt.compare(raw, user.password)).toEqual(true);
    done();
});

test('select users', async (done) => {
    const user = await userModel.getUser('orange');
    expect((await userModel.getUsers()).length).toBeGreaterThan(0);
    expect(await userModel.getUsers('test')).toHaveLength(0);
    expect(await userModel.getUsers('orange')).toHaveLength(1);
    expect(await userModel.getUsers(null, user[0].loungeNickName)).toHaveLength(1);
    expect(await userModel.getUsers(null, null, 'orange@sen.go.kr')).toHaveLength(1);
    expect(await userModel.getUsers(null, null, 'orange2@ssam.com')).toHaveLength(0);
    expect(await userModel.getUsers(null, null, null, -1)).toHaveLength(0);
    expect(await userModel.getUsers(null, null, null, null, 'BLOCKED')).toHaveLength(0);
    expect((await userModel.getUsers(null, null, null, null, 'NORMAL')).length).toBeGreaterThan(0);
    expect((await userModel.getUsers(null, null, null, null, null, 'LOUNGE_NICKNAME')).length).toBeGreaterThan(0);
    expect((await userModel.getUsers(null, null, null, null, null, 'EMAIL')).length).toBeGreaterThan(0);
    expect((await userModel.getUsers(null, null, null, null, null, 'USER_ID')).length).toBeGreaterThan(0);
    expect((await userModel.getUsers(null, null, null, null, null, 'PICTURE_PATH', false)).length).toBeGreaterThan(0);
    expect(await userModel.getUsers(null, null, null, null, null, undefined, false, 2)).toHaveLength(0);
    done();
});

test('get profile', async (done) => {
    const user = await userModel.getUser('orange');
    expect(await userModel.getProfile(user[0].loungeNickName)).toHaveProperty('nickName', user[0].loungeNickName);
    expect(await userModel.getProfile()).toEqual({});
    done();
});

test('update user info (except group)', async (done) => {
    expect(await userModel.updateUserInfo({ userId: 'orange', memo: 'testmemo' })).toBeGreaterThan(0);
    expect(await userModel.updateUserInfo({ userId: 'orange2', memo: 'testMemo' })).toEqual(0);
    done();
});
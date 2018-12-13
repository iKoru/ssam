/* global expect */
const groupModel = require('../../server/models/groupModel');

// test('insert group - init', async (done) => {
//     expect(await groupModel.createGroup({
//         groupName: '테스트 그룹',
//         groupDescription: '테스트 그룹입니다.',
//         groupType: 'N',
//         orderNumber: 1,
//         isOpenToUsers: true,
//         expirePeriod: -1
//     })).toHaveProperty('rowCount', 1);
//     expect(await groupModel.createGroup({
//         groupName: '테스트 전공',
//         groupDescription: '테스트 전공입니다.',
//         groupType: 'M',
//         orderNumber: 2,
//         isOpenToUsers: true,
//         expirePeriod: -1
//     })).toHaveProperty('rowCount', 1);
//     expect(await groupModel.createGroup({
//         groupName: '테스트 학년',
//         groupDescription: '테스트 학년입니다.',
//         groupType: 'G',
//         orderNumber: 3,
//         isOpenToUsers: true,
//         expirePeriod: -1
//     })).toHaveProperty('rowCount', 1);
//     expect(await groupModel.createGroup({
//         groupName: '테스트 지역',
//         groupDescription: '테스트 지역입니다.',
//         groupType: 'R',
//         orderNumber: 4,
//         isOpenToUsers: true,
//         expirePeriod: -1
//     })).toHaveProperty('rowCount', 1);
//     done();
// });

test('insert group', async (done) => {
    expect(await groupModel.createGroup({
        groupName: '테스트 그룹',
        groupDescription: '테스트 그룹입니다.',
        groupType: 'N',
        orderNumber: 1,
        isOpenToUsers: false,
        expirePeriod: -1
    })).toHaveProperty('rowCount', 1);
    expect(await groupModel.createGroup({
        groupName: '테스트 전공',
        groupDescription: '테스트 전공입니다.',
        groupType: 'M',
        orderNumber: 2,
        isOpenToUsers: false,
        expirePeriod: -1
    })).toHaveProperty('rowCount', 1);
    expect(await groupModel.createGroup({
        groupName: '테스트 학년',
        groupDescription: '테스트 학년입니다.',
        groupType: 'G',
        orderNumber: 3,
        isOpenToUsers: false,
        expirePeriod: -1
    })).toHaveProperty('rowCount', 1);
    expect(await groupModel.createGroup({
        groupName: '테스트 지역',
        groupDescription: '테스트 지역입니다.',
        groupType: 'R',
        orderNumber: 4,
        isOpenToUsers: false,
        expirePeriod: -1
    })).toHaveProperty('rowCount', 1);
    done();
});

test('get groups and group by group id', async (done) => {
    expect((await groupModel.getGroups(false, ['N', 'M', 'G', 'R'], 1)).length).toBeGreaterThan(0);
    expect(await groupModel.getGroups(true, ['N', 'M', 'G', 'R'], 99)).toHaveLength(0);
    expect((await groupModel.getGroups(true, ['N'], 1)).length).toBeGreaterThan(1);
    expect((await groupModel.getGroups(true, ['M'], 1)).length).toBeGreaterThan(1);
    expect((await groupModel.getGroups(true, ['G'], 1)).length).toBeGreaterThan(1);
    expect((await groupModel.getGroups(true, ['R'], 1)).length).toBeGreaterThan(1);
    let groups = await groupModel.getGroups(true, ['N', 'M', 'G', 'R'], 1);
    expect(groups.length).toBeGreaterThan(7);
    let dbGroup = (await groupModel.getGroup(groups[0].groupId));
    if (dbGroup.length > 0) {
        expect(dbGroup).toHaveLength(1);
        dbGroup = dbGroup[0];
        expect(dbGroup).toEqual(groups[0]);
    }
    done();
});

test('update group', async (done) => {
    const group = await groupModel.getGroups(true);
    expect(await groupModel.updateGroup({
        groupId: group[0].groupId,
        groupName: '테스트 그룹2',
        isOpenToUsers: true
    })).toEqual(1);
    expect((await groupModel.getGroup(group[0].groupId))[0].isOpenToUsers).toBeTruthy();
    expect(await groupModel.updateGroup({
        groupId: group[0].groupId,
        groupName: '테스트 그룹',
        isOpenToUsers: false
    })).toEqual(1);
    done();
});

test('delete group', async (done) => {
    let groups = await groupModel.getGroups(true, ['N', 'M', 'G', 'R'], 1);
    console.log(groups);
    let i = 0;
    while (i < groups.length) {
        if (groups[i].groupId > 42) {
            expect(await groupModel.deleteGroup(groups[i].groupId)).toEqual(1);
        }
        i++
    }
    done();
});

test('create, get, delete user group', async (done) => {
    const group = await groupModel.getGroups(true);
    await groupModel.deleteUserGroup('orange', group[0].groupId)
    expect(await groupModel.createUserGroup('orange', group[0].groupId)).toEqual(1);
    const group1 = await groupModel.getUserGroup('orange');
    expect(group1.some(x => x.groupId === group[0].groupId)).toBeTruthy();
    expect(await groupModel.deleteUserGroup('orange', group[0].groupId)).toEqual(1);
    const group2 = await groupModel.getUserGroup('orange');
    expect(group1.length).toBeGreaterThan(group2.length);
    done();
});

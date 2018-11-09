/* global expect */
const groupModel = require('../server/models/groupModel');
const constants = require('../server/constants');
test('insert group', async() => {
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
});

test('get groups and group by group id', async() => {
    expect(await groupModel.getGroups(false, ['N', 'M', 'G', 'R'], 1)).toHaveLength(0);
    expect(await groupModel.getGroups(true, ['N', 'M', 'G', 'R'], 2)).toHaveLength(0);
    expect(await groupModel.getGroups(true, ['N'], 1)).toHaveLength(2);
    expect(await groupModel.getGroups(true, ['M'], 1)).toHaveLength(2);
    expect(await groupModel.getGroups(true, ['G'], 1)).toHaveLength(2);
    expect(await groupModel.getGroups(true, ['R'], 1)).toHaveLength(2);
    let groups = await groupModel.getGroups(true, ['N', 'M', 'G', 'R'], 1);
    expect(groups).toHaveLength(8);
    groups.forEach(async(group) => {
        let dbGroup = (await groupModel.getGroup(group.groupId));
        if (dbGroup.length > 0) {
            expect(dbGroup).toHaveLength(1);
            dbGroup = dbGroup[0];
            expect(dbGroup).toEqual(group);
        }
    });
});

test('update group', async() => {
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
});

test('delete group', async() => {
    let groups = await groupModel.getGroups(true, ['N', 'M', 'G', 'R'], 1);
    groups.forEach(async(group) => {
        if (group.groupId > 42) {
            expect(await groupModel.deleteGroup(group.groupId)).toEqual(1);
        }
    });
});

test('create user group', async() => {
    const group = await groupModel.getGroups(true);
    expect(await groupModel.createUserGroup('orange2', group[0].groupId)).toHaveProperty('code', constants.dbErrorCode.FKVIOLATION);
    expect(await groupModel.createUserGroup('orange', group[0].groupId)).toEqual(1);
    expect(await groupModel.getUserGroup('orange')).toHaveLength(2);
});

test('delete user group', async() => {
    const group = await groupModel.getUserGroup('orange');
    expect(await groupModel.deleteUserGroup('orange', group[0].groupId)).toEqual(1);
    const group2 = await groupModel.getUserGroup('orange');
    expect(group.length).toBeGreaterThan(group2.length);
});
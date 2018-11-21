/* global expect */
const app = require('../../app')
const request = require('supertest')(app)
const headers = { 'Accept': 'application/json' };
const groupModel = require('../../server/models/groupModel');
describe('Test the group path', async () => {
    test('group get test', async (done) => {
        let response = await request.get('/group').set(headers).query({'groupType':123});
        expect(response.statusCode).toEqual(403);
        response = await request.get('/group').set(headers).query({'page':"aa"});
        expect(response.statusCode).toEqual(400);
        response = await request.get('/group').set(headers).query({'groupType':"aa"});
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toEqual(0);
        
        response = await request.get('/group').set(headers);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).not.toHaveProperty('isOpenToUsers');
        
        response = await request.post('/signin').set(headers).send({userId:'blue', password:'xptmxm1!'});
        expect(response.statusCode).toEqual(200);
        response = await request.get('/group').set({...headers, 'x-auth':response.body.token});
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('isOpenToUsers');
        
        done();
    })
    test('group create, update, delete test', async (done) => {
        let response = await request.post('/signin').set(headers).send({userId:'blue', password:'xptmxm1!'});
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth':response.body.token};
        
        //not authorized
        response = await request.post('/group').set(headers);
        expect(response.statusCode).toEqual(403);
        //no groupName
        response = await request.post('/group').set(headers_local).send({})
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupName');
        //invalid groupName
        response = await request.post('/group').set(headers_local).send({groupName:{}});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupName');
        //invalid groupName
        response = await request.post('/group').set(headers_local).send({groupName:''});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupName');
        response = await request.post('/group').set(headers_local).send({groupName:'test Group', groupDescription:{}});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupDescription');
        response = await request.post('/group').set(headers_local).send({groupName:'test Group', groupIconPath:{}});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupIconPath');
        //too long icon path
        response = await request.post('/group').set(headers_local).send({groupName:'test Group', groupIconPath:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupIconPath');
        response = await request.post('/group').set(headers_local).send({groupName:'test Group', groupType:'a'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupType');
        response = await request.post('/group').set(headers_local).send({groupName:'test Group'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupType');
        response = await request.post('/group').set(headers_local).send({groupName:'test Group', groupType: 'N', parentGroupId:'aa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'parentGroupId');
        response = await request.post('/group').set(headers_local).send({groupName:'test Group', groupType: 'N', parentGroupId:0});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'parentGroupId');
        response = await request.post('/group').set(headers_local).send({groupName:'test Group', groupType: 'N', expirePeriod:'aa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'expirePeriod');
        response = await request.post('/group').set(headers_local).send({groupName:'test Group', groupType: 'N'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'expirePeriod');
        response = await request.post('/group').set(headers_local).send({groupName:'test Group', groupType: 'N', expirePeriod:-1, isOpenToUsers:'aa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'isOpenToUsers');
        
        response = await request.post('/group').set(headers_local).send({groupName:'test Group', groupType: 'N', expirePeriod:-1, isOpenToUsers:false});
        console.log(response.body);
        expect(response.statusCode).toEqual(200);
        
        const groupId = response.body.groupId;
        expect(groupId).toBeGreaterThan(0);
        
        expect(await groupModel.getGroup(groupId)).toHaveLength(0);
        
        //update group
        response = await request.put('/group').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.put('/group').set(headers_local).send({});
        expect(response.statusCode).toEqual(400);
        response = await request.put('/group').set(headers_local).send({groupId: 'aa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupId');
        response = await request.put('/group').set(headers_local).send({groupId: groupId, groupName:{}});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupId');
        response = await request.put('/group').set(headers_local).send({groupId: groupId, groupName:'aaa', groupIconPath:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupIconPath');
        response = await request.put('/group').set(headers_local).send({groupId: groupId, groupName:'aaa', groupType:'aaa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'groupType');
        
        response = await request.put('/group').set(headers_local).send({groupId: groupId, groupName:'변경된 그룹 이름', groupType:'M'});
        expect(response.statusCode).toEqual(200);
        response = await groupModel.getGroup(groupId)
        expect(response[0].groupName).toEqual('변경된 그룹 이름');
        expect(response[0].groupType).toEqual('M')
        
        //delete group
        response = await request.delete('/group/'+groupId).set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.delete('/group/aaaaaa').set(headers_local);
        expect(response.statusCode).toEqual(400);
        response = await request.delete('/group/'+groupId).set(headers_local);
        expect(response.statusCode).toEqual(200);
        
        expect(await groupModel.getGroup(groupId)).toHaveLength(0);
        done();
    })
})
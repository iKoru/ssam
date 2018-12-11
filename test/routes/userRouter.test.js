/* global expect */
const app = require('../../app')
const request = require('supertest')(app),
    userModel = require('../../server/models/userModel'),
    groupModel = require('../../server/models/groupModel'),
    boardModel = require('../../server/models/boardModel')
const headers = { 'Accept': 'application/json' };
const util = require('../../server/util');
describe('Test the user path', async () => {
    // test('user pre test', async(done) => {
    //     expect(await userModel.updateUserAdmin({ userId: 'blue', isAdmin: true })).toEqual(1);
    //     done();
    // })
    test('user get test', async (done) => {
        let response = await request.get('/user').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let jwt = response.body.token;
        response = await request.get('/user').set({ 'x-auth': jwt, ...headers }).query({ 'userId': 'orange' });
        expect(response.statusCode).toEqual(200);
        expect(response.body).toHaveProperty('userId');
        expect(response.body).toHaveProperty('email');
        response = await request.get('/user').set({ 'x-auth': jwt, ...headers }).query({ 'userId': 'blue' });
        expect(response.statusCode).toEqual(403);
        done();
    })
    test('signup test', async (done) => {
        await userModel.deleteUser('orange1');
        //not acceptable email host
        let response = await request.post('/user').set(headers).send({ userId: 'orange1', email: 'orange1@test.com', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(400);
        //no password parameter
        response = await request.post('/user').set(headers).send({ userId: 'orange1', email: 'orange1@test.com' });
        expect(response.statusCode).toEqual(400);
        //no userId parameter
        response = await request.post('/user').set(headers).send({ email: 'orange1@test.com', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(400);
        //successfully signed up
        response = await request.post('/user').set(headers).send({ userId: 'orange1', email: 'orange1@sen.go.kr', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        //created user id check
        let user = await userModel.getUser('orange1');
        expect(user).toHaveLength(1);
        //reserved id check
        response = await request.post('/user').set(headers).send({ userId: 'admin', email: 'admin@sen.go.kr', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(400);
        //already existing user Id
        response = await request.post('/user').set(headers).send({ userId: 'orange1', email: 'orange12@sen.go.kr', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(409);
        //already existing email check
        response = await request.post('/user').set(headers).send({ userId: 'orange1233', email: 'orange1@sen.go.kr', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(409);
        //registered id signin check
        response = await request.post('/signin').set(headers).send({ userId: 'orange1', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        expect(response.body.token.length).toBeGreaterThan(20);
        //restore temporary created userId
        expect(await userModel.deleteUser('orange1')).toEqual(1);

        done();
    })

    test('user put test', async (done) => {
        let response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };

        expect(await userModel.updateUserInfoDate('orange', null, null, null)).toEqual(1); //reset info modified date
        //not allowed to change other users' information
        response = await request.put('/user').set(headers_local).send({ userId: 'blue', topicNickName: 'aaa' });
        expect(response.statusCode).toEqual(400);
        //no required parameter : userId
        response = await request.put('/user').set(headers_local).send({ topicNickName: 'aaa' });
        expect(response.statusCode).toEqual(400);
        const original = await userModel.getUser('orange');
        const other = await userModel.getUser('blue');
        expect(other).toHaveLength(1);
        //duplicate topic nickName
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', topicNickName: other[0].topicNickName });
        expect(response.statusCode).toEqual(409);
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', loungeNickName: other[0].topicNickName });
        expect(response.statusCode).toEqual(409);
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', loungeNickName: other[0].loungeNickName });
        expect(response.statusCode).toEqual(409);
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', loungeNickName: 'admin' });
        expect(response.statusCode).toEqual(400);
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', topicNickName: 'admin' });
        expect(response.statusCode).toEqual(400);

        //duplicate email
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', email: other[0].email });
        expect(response.statusCode).toEqual(409);
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', email: 'test@test.com' });
        expect(response.statusCode).toEqual(400);

        //get group for major
        const majors = await groupModel.getGroups(true, ['M'], 1);
        const grades = await groupModel.getGroups(true, ['G'], 1);
        expect(majors.length).toBeGreaterThan(0);
        expect(grades.length).toBeGreaterThan(0);

        //invalid major / grade
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', major: grades[0].groupId });
        expect(response.statusCode).toEqual(400);
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', major: -1 });
        expect(response.statusCode).toEqual(400);
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', grade: majors[0].groupId });
        expect(response.statusCode).toEqual(400);
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', grade: -1 });
        expect(response.statusCode).toEqual(400);

        //status
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', status: 'aaa' });
        expect(response.statusCode).toEqual(400);

        //no changes
        response = await request.put('/user').set(headers_local).send({ userId: 'orange' });
        expect(response.statusCode).toEqual(400);

        //successfully change informations
        const parameters = {
            userId: 'orange',
            loungeNickName: util.partialUUID() + util.partialUUID(),
            topicNickName: util.partialUUID() + util.partialUUID(),
            status: 'BLOCKED',
            email: 'test@sen.go.kr',
            major: majors[0].groupId,
            grade: grades[0].groupId,
            isOpenInfo: true
        }
        response = await request.put('/user').set(headers_local).send(parameters);
        expect(response.statusCode).toEqual(200);

        const after = (await userModel.getUser('orange'))[0];
        expect(after.loungeNickName).toEqual(parameters.loungeNickName);
        expect(after.topicNickName).toEqual(parameters.topicNickName);
        expect(after.email).toEqual(parameters.email);
        expect(after.status).toEqual(parameters.status);
        expect(after.isOpenInfo).toEqual(parameters.isOpenInfo);
        const afterMajor = await groupModel.getUserGroup('orange', 'M');
        const afterGrade = await groupModel.getUserGroup('orange', 'G');
        expect(afterMajor[0].groupId).toEqual(parameters.major);
        expect(afterGrade[0].groupId).toEqual(parameters.grade);

        //info modified date check
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', loungeNickName: util.partialUUID() });
        expect(response.statusCode).toEqual(400);
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', topicNickName: util.partialUUID() });
        expect(response.statusCode).toEqual(400);
        response = await request.put('/user').set(headers_local).send({ userId: 'orange', grade: '' });
        expect(response.statusCode).toEqual(400);

        //restore original state
        expect(await userModel.updateUserInfoDate('orange', null, null, null)).toEqual(1);
        delete original[0].password;
        expect(await request.put('/user').set(headers_local).send(original[0])).toHaveProperty('statusCode', 200);
        done();
    })
    test('user delete test', async (done) => {
        let response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        const headers_local = { ...headers, 'x-auth': response.body.token };
        //no parameters given
        response = await request.delete('/user/').set(headers_local);
        expect(response.statusCode).toEqual(404);
        //try to delete self
        response = await request.delete('/user/blue').set(headers_local);
        expect(response.statusCode).toEqual(400);
        //not existing user id
        response = await request.delete('/user/blue1234').set(headers_local);
        expect(response.statusCode).toEqual(404);

        //create temporary user id
        response = await request.post('/user').set(headers).send({
            userId: 'blue123',
            password: 'xptmxm1!',
            email: 'blue123@sen.go.kr'
        })
        expect(response.statusCode).toEqual(200);
        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        //admin only
        response = await request.delete('/user/blue123').set({ ...headers, 'x-auth': response.body.token });
        expect(response.statusCode).toEqual(403);

        response = await request.delete('/user/blue123').set(headers_local);
        expect(response.statusCode).toEqual(200);

        done();
    })
    test('user list get test', async (done) => {
        let response = await request.get('/user/list').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.get('/user/list').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(1);
        response = await request.get('/user/list').set(headers_local).query({ userId: 'orange' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThanOrEqual(1);
        response = await request.get('/user/list').set(headers_local).query({ email: 'orange@sen.go.kr' });
        expect(response.statusCode).toEqual(200);
        expect(response.body).toHaveLength(1);
        response = await request.get('/user/list').set(headers_local).query({ sortTarget: 'email' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(1);
        response = await request.get('/user/list').set(headers_local).query({ page: 2 });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toEqual(0);
        done();
    })
    test('user document get test', async (done) => {
        let response = await request.get('/user/document').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.get('/user/document').set(headers_local).query({ userId: 'blue' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(1);
        response = await request.get('/user/document').set(headers_local).query({ userId: 'orange' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(1);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.get('/user/document').set(headers_local).query({ userId: 'blue' });
        expect(response.statusCode).toEqual(400);
        response = await request.get('/user/document').set(headers_local).query({ userId: 'orange' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(1);

        done();
    })
    test('user comment get test', async (done) => {
        let response = await request.get('/user/comment').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.get('/user/comment').set(headers_local).query({ userId: 'blue' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(1);
        response = await request.get('/user/comment').set(headers_local).query({ userId: 'orange' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(1);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.get('/user/comment').set(headers_local).query({ userId: 'blue' });
        expect(response.statusCode).toEqual(400);
        response = await request.get('/user/comment').set(headers_local).query({ userId: 'orange' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(1);
        done();
    })
    test('user board put test', async (done) => {
        let response = await request.put('/user/board').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.put('/user/board').set(headers_local);
        expect(response.statusCode).toEqual(400);
        const boards = await boardModel.getBoards(null, 'T');
        expect(boards.length).toBeGreaterThan(0);
        //admin
        // response = await request.put('/user/board').set(headers_local).send({ boards: boards.filter(x => x.allGroupAuth !== 'NONE')[0].boardId });
        // expect(response.statusCode).toEqual(200);
        // response = await request.get('/user/board').set(headers_local);
        // expect(response.statusCode).toEqual(200);
        // expect(response.body.length).toBeGreaterThan(0);
        response = await request.put('/user/board').set(headers_local).send({ boards: boards.map(x => x.boardId) });
        expect(response.statusCode).toEqual(200);
        response = await request.get('/user/board').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThanOrEqual(boards.length);
        response = await request.put('/user/board').set(headers_local).send({ boards: boards.filter(x => (x.boardId !== 'nofree')).map(x => x.boardId) });
        expect(response.statusCode).toEqual(200);
        response = await request.get('/user/board').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(boards.filter(x => (x.boardId !== 'nofree')).length);

        //not admin
        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.put('/user/board').set(headers_local);
        expect(response.statusCode).toEqual(400);

        // response = await request.put('/user/board').set(headers_local).send({ boards: boards.filter(x => (x.allGroupAuth !== 'NONE') && (x.ownerId === 'orange'))[0].boardId });
        // expect(response.statusCode).toEqual(200);
        // response = await request.get('/user/board').set(headers_local);
        // expect(response.statusCode).toEqual(200);
        // expect(response.body.length).toBeGreaterThan(0);
        response = await request.put('/user/board').set(headers_local).send({ boards: boards.map(x => x.boardId) });
        expect(response.statusCode).toEqual(200);
        response = await request.get('/user/board').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toEqual(boards.filter(x => (x.boardId !== 'nofree')).length);
        response = await request.put('/user/board').set(headers_local).send({ boards: boards.filter(x => (x.boardId !== 'nofree')).map(x => x.boardId) });
        expect(response.statusCode).toEqual(200);
        response = await request.get('/user/board').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toEqual(boards.filter(x => (x.boardId !== 'nofree')).length);

        done();
    })
    test('user board get test', async (done) => {
        let response = await request.get('/user/board').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.get('/user/board').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.get('/user/board').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toEqual(0);
        done();
    })

    test('user group put test', async (done) => {
        let response = await request.put('/user/group').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.put('/user/group').set(headers_local);
        expect(response.statusCode).toEqual(400);
        const groups = await groupModel.getGroups(true, ['N', 'M', 'G']);
        expect(groups.length).toBeGreaterThan(2);
        //admin
        response = await request.put('/user/group').set(headers_local).send({ userId: 'blue', groups: groups[0].groupId });
        expect(response.statusCode).toEqual(200);
        response = await request.get('/user/group').set(headers_local).query({ userId: 'blue' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toEqual(1);
        //no admin
        response = await request.put('/user/group').set(headers_local).send({ userId: 'orange', groups: groups[0].groupId });
        expect(response.statusCode).toEqual(200);
        response = await request.get('/user/group').set(headers_local).query({ userId: 'orange' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toEqual(1);
        response = await request.put('/user/group').set(headers_local).send({ userId: 'orange', groups: groups.map(x => x.groupId) });
        expect(response.statusCode).toEqual(200);
        response = await request.get('/user/group').set(headers_local).query({ userId: 'orange' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toEqual(groups.length);
        done();
    })
    test('user group get test', async (done) => {
        let response = await request.get('/user/group').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.get('/user/group').set(headers_local).query({ userId: 'blue' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        response = await request.get('/user/group').set(headers_local).query({ userId: 'orange' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(1);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.get('/user/group').set(headers_local).query({ userId: 'orange' });
        expect(response.statusCode).toEqual(403);
        done();
    })


})
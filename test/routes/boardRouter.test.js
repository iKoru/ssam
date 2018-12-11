/* global expect */
const app = require('../../app'),
    request = require('supertest')(app),
    boardModel = require('../../server/models/boardModel'),
    groupModel = require('../../server/models/groupModel'),
    userModel = require('../../server/models/userModel'),
    headers = { 'Accept': 'application/json' };

describe('Test the board path', async () => {
    // test('board test init - create new user', async (done) => {
    //     let response = await request.post('/user').set(headers).send({ userId: 'reds', password: 'xptmxm1!', email: 'reds@sen.go.kr' });
    //     expect(response.statusCode).toEqual(200);
    //     response = await request.post('/user').set(headers).send({ userId: 'black', password: 'xptmxm1!', email: 'black@sen.go.kr' });
    //     expect(response.statusCode).toEqual(200);
    //     done();
    // })
    test('board (list) get test', async (done) => {
        let response = await request.get('/board').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'reds', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'reds', status: 'NORMAL' });
        expect(response).toEqual(1);
        //need auth
        response = await request.get('/board').set(headers_local);
        expect(response.statusCode).toEqual(403);

        response = await userModel.updateUserInfo({ userId: 'reds', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        response = await request.get('/board').set(headers_local);
        expect(response.statusCode).toEqual(400);

        response = await boardModel.getBoards();
        expect(response.length).toBeGreaterThan(0);
        const boardId = response[0].boardId;

        response = await request.get('/board').set(headers_local).query({ boardId: boardId });
        expect(response.statusCode).toEqual(200);
        expect(response.body.boardId).toEqual(boardId);

        response = await request.get('/board').set(headers_local).query({ boardId: 'aaaaaaaaaaaa' });
        expect(response.statusCode).toEqual(404);

        response = await request.get('/board/list').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.get('/board/list').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(1);

        expect((await request.get('/board/list').set(headers_local).query({ isAscending: false })).body).toEqual(response.body);
        response = await request.get('/board/list').set(headers_local).query({ searchQuery: '자유' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(1);

        response = await userModel.updateUserInfo({ userId: 'reds', status: 'NORMAL' });
        expect(response).toEqual(1);
        done();
    })
    test('board create, put, delete test', async (done) => {
        let response = await request.post('/board').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'black', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'black', status: 'NORMAL' });
        expect(response).toEqual(1);
        //need auth
        response = await request.post('/board').set(headers_local);
        expect(response.statusCode).toEqual(403);

        response = await userModel.updateUserInfo({ userId: 'black', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        response = await request.post('/board').set(headers_local).send({});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardType')
        response = await request.post('/board').set(headers_local).send({ boardType: 'A' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardType')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardId')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: {} });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardId')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: '' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardId')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: 'a' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardName')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: 'a', boardName: '' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardName')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: 'a', boardName: {} });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardName')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: 'a', boardName: 'aasdf', boardDescription: {} });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardDescription')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: 'a', boardName: 'aasdf', boardDescription: 'description!!', allowAnonymous: 'aa' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'allowAnonymous')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: 'a', boardName: 'aasdf', boardDescription: 'description!!', allowAnonymous: true });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'allGroupAuth')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: 'a', boardName: 'aasdf', boardDescription: 'description!!', allowAnonymous: true, allGroupAuth: 'aa' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'allGroupAuth')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: 'a(*&^', boardName: 'aasdf', boardDescription: 'description!!', allowAnonymous: true, allGroupAuth: 'READWRITE' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardId')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: 'document', boardName: 'aasdf', boardDescription: 'description!!', allowAnonymous: true, allGroupAuth: 'READWRITE' });
        expect(response.statusCode).toEqual(403);
        expect(response.body).toHaveProperty('target', 'boardId')
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: 'free', boardName: 'aasdf', boardDescription: 'description!!', allowAnonymous: true, allGroupAuth: 'READWRITE' });
        expect(response.statusCode).toEqual(409);
        expect(response.body).toHaveProperty('target', 'boardId')

        let groups = await groupModel.getGroups(true);
        let groupsParam = [];
        groups.map(x => {
            groupsParam.push({
                groupId: x.groupId,
                authType: 'READWRITE'
            })
        });
        response = await request.post('/board').set(headers_local).send({ boardType: 'T', boardId: 'freefree', boardName: 'aasdf', boardDescription: 'description!!', allowAnonymous: true, allGroupAuth: 'READWRITE', allowedGroups: groupsParam });
        expect(response.statusCode).toEqual(200);

        response = await boardModel.getBoard('freefree');
        expect(response.length).toEqual(1);
        response = await boardModel.getBoardAuth('freefree');
        expect(response.length).toBeGreaterThan(0);

        //put board
        response = await request.put('/board').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.put('/board').set(headers_local);
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardId');
        response = await request.put('/board').set(headers_local).send({ boardId: 'asdfasdfasdf' });
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'boardId');

        response = await request.put('/board').set(headers_local).send({ boardId: 'freefree' });
        expect(response.statusCode).toEqual(400);
        response = await boardModel.updateBoard({ boardId: 'freefree', reservedContents: { aa: 'aa' } });
        expect(response).toEqual(1);
        response = await request.put('/board').set(headers_local).send({ boardId: 'freefree' });
        expect(response.statusCode).toEqual(403);
        response = await boardModel.updateBoard({ boardId: 'freefree', reservedContents: null });
        expect(response).toEqual(1);
        //nothing to change
        response = await request.put('/board').set(headers_local).send({ boardId: 'freefree', overwrite: true, ownerNickName: 'asdfasdf' });
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'ownerNickName');

        response = await userModel.getUser('orange');
        response = await request.put('/board').set(headers_local).send({ boardId: 'freefree', overwrite: true, ownerNickName: response[0].topicNickName });
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'ownerNickName');

        response = await request.put('/board').set(headers_local).send({ boardID: 'freefree', overwrite: true, allowAnonymous: 'aaa' })
        expect(response.statusCode).toEqual(400);

        response = await request.put('/board').set(headers_local).send({ boardID: 'freefree', overwrite: true, allowAnonymous: 'false' })
        expect(response.statusCode).toEqual(400);

        response = await request.put('/board').set(headers_local).send({ boardId: 'freefree', overwrite: true, allowAnonymous: true });
        expect(response.statusCode).toEqual(400);

        response = await request.put('/board').set(headers_local).send({ boardId: 'freefree', overwrite: true, allowAnonymous: false });
        expect(response.statusCode).toEqual(200);

        response = await boardModel.getBoard('freefree');
        expect(response.length).toEqual(1);
        expect(response[0].reservedContents).toHaveProperty('allowAnonymous', false);

        //delete board
        response = await request.delete('/board/123123').set(headers);
        expect(response.statusCode).toEqual(404);
        response = await request.delete('/board/freefree').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.delete('/board/freefree').set(headers_local);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        headers_local = { ...headers, 'x-auth': response.body.token };
        response = await request.delete('/board/freefree').set(headers_local);
        expect(response.statusCode).toEqual(200);

        response = await userModel.updateUserInfo({ userId: 'black', status: 'NORMAL' });
        expect(response).toEqual(1);
        done();
    })

})
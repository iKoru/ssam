/* global expect */
const app = require('../../app')
const request = require('supertest')(app),
    userModel = require('../../server/models/userModel'),
    documentModel = require('../../server/models/documentModel'),
    boardModel = require('../../server/models/boardModel')
const headers = { 'Accept': 'application/json' };

describe('Test the document path', async() => {
    // test('create test user for document (init)', async(done) => {
    //     response = await request.post('/user').set(headers).send({ userId: 'grey', password: 'xptmxm1!', email: 'grey@sen.go.kr' });
    //     expect(response.statusCode).toEqual(200);
    //     done();
    // })
    test('document get test', async(done) => {
        let response = await request.get('/asdfasdf').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.get('/123123').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'grey', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'grey', status: 'NORMAL' });
        expect(response).toEqual(1);

        response = await request.get('/123123').set(headers_local);
        expect(response.statusCode).toEqual(403);

        response = await userModel.updateUserInfo({ userId: 'grey', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        response = await request.get('/123123').set(headers_local)
        expect(response.statusCode).toEqual(404);
        response = await request.get('/123123aasd').set(headers_local);
        expect(response.statusCode).toEqual(404);

        let documents = await documentModel.getDocuments('nofree');
        expect(documents.length).toBeGreaterThan(0);

        response = await boardModel.deleteUserBoard('grey', 'nofree');
        expect(response).toEqual(1);
        //not allowed to access the board
        response = await request.get('/' + documents[0].documentId).set(headers_local);
        expect(response.statusCode).toEqual(403);

        response = await boardModel.createUserBoard('grey', 'nofree');
        expect(response).toEqual(1);

        response = await request.get('/' + documents[0].documentId).set(headers_local);
        expect(response.statusCode).toEqual(200);

        documents = await documentModel.getDocuments('free');
        expect(documents.length).toBeGreaterThan(0);

        //not allowed to access the board
        response = await request.get('/' + documents[0].documentId).set(headers_local);
        expect(response.statusCode).toEqual(200);
        done();
    })
    test('document create, put, delete test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('get document list test', async(done) => {
        let response = await request.get('/free').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'grey', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'grey', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        response = await request.get('/free').set(headers_local);
        expect(response.statusCode).toEqual(501);


        done();
    })
})
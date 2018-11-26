/* global expect */
const app = require('../../app')
const request = require('supertest')(app),
    userModel = require('../../server/models/userModel'),
    documentModel = require('../../server/models/documentModel'),
    boardModel = require('../../server/models/boardModel')
const headers = { 'Accept': 'application/json' };

describe('Test the document path', async() => {
    // test('create test user for document (init)', async(done) => {
    //     let response = await request.post('/user').set(headers).send({ userId: 'grey', password: 'xptmxm1!', email: 'grey@sen.go.kr' });
    //     expect(response.statusCode).toEqual(200);
    //        let response = await boardModel.createUserBoard('grey', 'nofree');
    //        expect(response).toEqual(1);
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
        let response = await request.post('/document').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'orange', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        response = await request.post('/document').set(headers_local);
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardId');
        response = await request.post('/document').set(headers_local).send({ boardId: {} });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardId');
        response = await request.post('/document').set(headers_local).send({ boardId: true });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardId');
        response = await request.post('/document').set(headers_local).send({ boardId: '' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardId');
        response = await request.post('/document').set(headers_local).send({ boardId: 'seoula', isAnonymous: 'aa' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'isAnonymous');
        response = await request.post('/document').set(headers_local).send({ boardId: 'seoula', isAnonymous: {} });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'isAnonymous');
        response = await request.post('/document').set(headers_local).send({ boardId: 'seoula', isAnonymous: true });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'title');
        response = await request.post('/document').set(headers_local).send({ boardId: 'seoula', isAnonymous: true, title: 123 });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'title');
        response = await request.post('/document').set(headers_local).send({ boardId: 'seoula', isAnonymous: true, title: '' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'title');
        response = await request.post('/document').set(headers_local).send({ boardId: 'seoula', isAnonymous: true, title: '123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890111' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'title');
        response = await request.post('/document').set(headers_local).send({ boardId: 'seoula', isAnonymous: true, title: 'asdf' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'contents');
        response = await request.post('/document').set(headers_local).send({ boardId: 'seoula', isAnonymous: true, title: 'asdf', contents: true });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'contents');
        response = await request.post('/document').set(headers_local).send({ boardId: 'seoula', isAnonymous: false, title: 'asdf', contents: 'asdfasdf' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'allowAnonymous');
        response = await request.post('/document').set(headers_local).send({ boardId: 'seoula', isAnonymous: true, title: 'asdf', contents: 'asdfasdf', allowAnonymous: false });
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'boardId');
        response = await request.post('/document').set(headers_local).send({ boardId: 'seoul', isAnonymous: true, title: 'asdf', contents: 'asdfasdf', allowAnonymous: false });
        expect(response.statusCode).toEqual(200);
        expect(response.body.documentId).toBeGreaterThan(0);

        const documentId = response.body.documentId;
        const document = await documentModel.getDocument(documentId);
        expect(document.length).toEqual(1);
        expect(document[0]).toHaveProperty('allowAnonymous', true);

        //put document
        response = await request.put('/document').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.put('/document').set(headers_local).send({});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId')

        response = await request.put('/document').set(headers_local).send({ documentId: 'aaaa' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId')
        response = await request.put('/document').set(headers_local).send({ documentId: 123, isDeleted: 'aaaa' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'isDeleted')

        response = await userModel.updateUserInfo({ userId: 'grey', status: 'AUTHORIZED' });
        expect(response).toEqual(1);
        response = await request.post('/signin').set(headers).send({ userId: 'grey', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        response = await request.put('/document').set({...headers, 'x-auth': response.body.token }).send({ documentId: documentId });
        expect(response.statusCode).toEqual(403);

        response = await request.put('/document').set(headers_local).send({ documentId: documentId, title: 'changed?', contents: '' })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'contents');

        response = await request.put('/document').set(headers_local).send({ documentId: documentId, title: 'changed?', contents: 'changed!' })
        expect(response.statusCode).toEqual(200);

        response = await documentModel.getDocument(documentId);
        expect(response.length).toEqual(1);
        expect(response[0]).toHaveProperty('title', 'asdf');
        expect(response[0]).toHaveProperty('contents', 'changed!')

        //delete document
        response = await request.delete('/document/' + documentId).set(headers);
        expect(response.status).toEqual(403);

        response = await request.delete('/document/asdf').set(headers);
        expect(response.status).toEqual(404);

        response = await request.post('/signin').set(headers).send({ userId: 'grey', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        response = await request.delete('/document/' + documentId).set({...headers, 'x-auth': response.body.token });
        expect(response.statusCode).toEqual(403);
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        response = await request.delete('/document/' + documentId).set({...headers, 'x-auth': response.body.token });
        expect(response.statusCode).toEqual(200);

        response = await documentModel.getDocument(documentId);
        expect(response.length).toEqual(0);

        done();
    })
    test('get document list test', async(done) => {
        let response = await request.get('/free').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'grey', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'grey', status: 'NORMAL' });
        expect(response).toEqual(1);

        response = await request.get('/free').set(headers_local);
        expect(response.statusCode).toEqual(403);

        response = await userModel.updateUserInfo({ userId: 'grey', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        response = await request.get('/free').set(headers_local);
        expect(response.statusCode).toEqual(501);

        response = await userModel.updateUserInfo({ userId: 'grey', status: 'NORMAL' });
        expect(response).toEqual(1);

        done();
    })
})
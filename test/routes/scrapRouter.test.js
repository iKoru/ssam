/* global expect */
const app = require('../../app'),
    request = require('supertest')(app),
    scrapModel = require('../../server/models/scrapModel'),
    documentModel = require('../../server/models/documentModel'),
    userModel = require('../../server/models/userModel')
const headers = { 'Accept': 'application/json' };

describe('Test the scrap path', async() => {

    test('scrap crd test', async(done) => {
        let response = await request.post('/scrap').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'orange', status: 'NORMAL' });
        expect(response).toEqual(1);
        response = await request.post('/scrap').set(headers_local).send();
        expect(response.statusCode).toEqual(403);

        response = await userModel.updateUserInfo({ userId: 'orange', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        const scrapGroup = await scrapModel.getScrapGroupByUserId('orange');
        expect(scrapGroup.length).toBeGreaterThan(0);
        const document = await documentModel.getDocuments('free');
        expect(document.length).toBeGreaterThan(0);

        response = await request.post('/scrap').set(headers_local).send()
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'scrapGroupId');
        response = await request.post('/scrap').set(headers_local).send({ scrapGroupId: 0 })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId');
        response = await request.post('/scrap').set(headers_local).send({ scrapGroupId: scrapGroup[0].scrapGroupId })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId');
        response = await request.post('/scrap').set(headers_local).send({ scrapGroupId: scrapGroup[0].scrapGroupId, documentId: 'asdfasdf' })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId');
        response = await request.post('/scrap').set(headers_local).send({ scrapGroupId: 0, documentId: 9999999 })
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'scrapGroupId');
        response = await request.post('/scrap').set(headers_local).send({ scrapGroupId: scrapGroup[0].scrapGroupId, documentId: 9999999 })
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'documentId');

        response = await documentModel.getDocuments('nofree');
        expect(response.length).toBeGreaterThan(0);
        response = await request.post('/scrap').set(headers_local).send({ scrapGroupId: scrapGroup[0].scrapGroupId, documentId: response[0].documentId })
        expect(response.statusCode).toEqual(403);
        expect(response.body).toHaveProperty('target', 'documentId');

        response = await request.post('/scrap').set(headers_local).send({ scrapGroupId: scrapGroup[0].scrapGroupId, documentId: document[0].documentId })
        expect(response.statusCode).toEqual(200);

        //get scrap
        response = await userModel.updateUserInfo({ userId: 'orange', status: 'NORMAL' });
        expect(response).toEqual(1);
        response = await request.get('/scrap/' + scrapGroup[0].scrapGroupId).set(headers_local).query({ page: 'aaa' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'page')
        response = await request.get('/scrap/' + scrapGroup[0].scrapGroupId).set(headers_local).query({ page: 1 });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body.find(x => x.documentId === document[0].documentId)).not.toEqual(undefined)

        //delete scrap
        response = await request.delete('/scrap/0/0').set(headers_local)
        expect(response.statusCode).toEqual(404)
        response = await request.delete('/scrap/1/0').set(headers_local)
        expect(response.statusCode).toEqual(404)
        response = await request.delete('/scrap/' + scrapGroup[0].scrapGroupId + '/' + document[0].documentId).set(headers_local)
        expect(response.statusCode).toEqual(200)

        done();
    })
    test('scrap group crud test', async(done) => {
        let response = await request.post('/scrap/group').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await request.post('/scrap/group').set(headers_local).send();
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'scrapGroupName');
        response = await request.post('/scrap/group').set(headers_local).send({ scrapGroupName: '12345678901234567890123456789012345678901234567890132' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'scrapGroupName');
        response = await request.post('/scrap/group').set(headers_local).send({ scrapGroupName: 'test group!' });
        expect(response.statusCode).toEqual(200);

        const scrapGroupId = response.body.scrapGroupId;
        expect(scrapGroupId).toBeGreaterThan(0);

        //get scrap group test
        response = await request.get('/scrap/group').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body.find(x => x.scrapGroupId === scrapGroupId)).not.toEqual(undefined)

        //update scrap group test
        response = await request.put('/scrap/group').set(headers_local).send()
        expect(response.statusCode).toEqual(400)
        expect(response.body).toHaveProperty('target', 'scrapGroupName');
        response = await request.put('/scrap/group').set(headers_local).send({ scrapGroupName: '' })
        expect(response.statusCode).toEqual(400)
        expect(response.body).toHaveProperty('target', 'scrapGroupName');
        response = await request.put('/scrap/group').set(headers_local).send({ scrapGroupName: '12345678901234567890123456789012345678901234567890132' })
        expect(response.statusCode).toEqual(400)
        expect(response.body).toHaveProperty('target', 'scrapGroupName');
        response = await request.put('/scrap/group').set(headers_local).send({ scrapGroupName: 'changed group name!' })
        expect(response.statusCode).toEqual(400)
        expect(response.body).toHaveProperty('target', 'scrapGroupId');
        response = await request.put('/scrap/group').set(headers_local).send({ scrapGroupName: 'changed group name!', scrapGroupId: 0 })
        expect(response.statusCode).toEqual(404)
        expect(response.body).toHaveProperty('target', 'scrapGroupId');
        response = await request.put('/scrap/group').set(headers_local).send({ scrapGroupName: 'changed group name!', scrapGroupId: 999 })
        expect(response.statusCode).toEqual(404)
        expect(response.body).toHaveProperty('target', 'scrapGroupId');
        response = await request.put('/scrap/group').set(headers_local).send({ scrapGroupName: 'changed group name!', scrapGroupId: scrapGroupId })
        expect(response.statusCode).toEqual(200)

        response = await request.get('/scrap/group').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body.find(x => x.scrapGroupId === scrapGroupId)).toHaveProperty('scrapGroupName', 'changed group name!')

        //delete scrap group
        response = await request.delete('/scrap/group/0').set(headers_local);
        expect(response.statusCode).toEqual(404)
        expect(response.body).toHaveProperty('target', 'scrapGroupId');
        response = await request.delete('/scrap/group/1233').set(headers_local);
        expect(response.statusCode).toEqual(404)
        expect(response.body).toHaveProperty('target', 'scrapGroupId');
        response = await request.delete('/scrap/group/' + scrapGroupId).set(headers_local);
        expect(response.statusCode).toEqual(200)

        response = await request.get('/scrap/group').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body.find(x => x.scrapGroupId === scrapGroupId)).toEqual(undefined)

        done();
    })

})
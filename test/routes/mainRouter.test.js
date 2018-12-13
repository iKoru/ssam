/* global expect */
const app = require('../../app'),
    request = require('supertest')(app),
    boardModel = require('../../server/models/boardModel'),
    userModel = require('../../server/models/userModel'),
    documentModel = require('../../server/models/documentModel'),
    headers = { 'Accept': 'application/json' };
    
describe('Test the main path', async () => {
    test('index test', async (done) => {
        expect(1).toEqual(1);
        done();
    })

    test('main test', async (done) => {
        expect(1).toEqual(1);
        done();
    })

    test('profile test', async (done) => {
        let response = await request.get('/profile').set(headers);
        expect(response.statusCode).toEqual(401);
        
        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'orange', status: 'AUTHORIZED' });
        expect(response).toEqual(1);
        
        response = await request.get('/profile').set(headers_local).query({nickName:'1111'});
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'nickName')
        
        response = await userModel.getUser('blue');
        expect(response.length).toEqual(1);
        
        response = await request.get('/profile').set(headers_local).query({nickName:response[0].loungeNickName});
        expect(response.statusCode).toEqual(200);
        expect(response.body).toHaveProperty('nickName');
        
        done();
    })

    test('document list in board test', async (done) => {
        let response = await request.get('/free').set(headers);
        expect(response.statusCode).toEqual(401);
        
        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'orange', status: 'AUTHORIZED' });
        expect(response).toEqual(1);
        
        response = await request.get('/nofree').set(headers_local);
        expect(response.statusCode).toEqual(403);
        expect(response.body).toHaveProperty('target', 'boardId');
        
        response = await request.get('/free').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        
        done();
    });
    test('best document list test', async (done) => {
        let response = await request.get('/loungeBest').set(headers);
        expect(response.statusCode).toEqual(401);
        
        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'orange', status: 'AUTHORIZED' });
        expect(response).toEqual(1);
        
        // response = await request.get('/loungeBest').set(headers_local);
        // expect(response.statusCode).toEqual(200);
        
        //find writable lounge board
        let boards = await boardModel.getBoards(null, 'L');
        expect(boards.length).toBeGreaterThan(0);
        
        let i=0;
        while(i<boards.length){
            response = await boardModel.checkUserBoardWritable('orange', boards[i].boardId)
            if(response.length > 0 && response[0].count > 0){
                break;
            }
            i++;
        }
        expect(i).not.toEqual(boards.length);
        
        //create temporary document to test
        response = await request.post('/document').set(headers_local).send({ boardId: boards[i].boardId, isAnonymous: true, title: 'asdf', contents: 'asdfasdf', allowAnonymous: false })
        expect(response.statusCode).toEqual(200);
        let documentId = response.body.documentId;
        
        //make it as best
        let j = 0;
        while (j < 14) {
            await documentModel.updateDocumentVote(documentId, true);
            j++;
        }
        response = await request.post('/vote/document').set(headers_local).send({documentId:documentId});
        expect(response.statusCode).toEqual(200);
        
        response = await request.get('/'+documentId).set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.bestDateTime).not.toEqual(undefined)
        
        response = await request.get('/loungeBest').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.filter(x=>x.documentId === documentId).length).toBeGreaterThan(0);
        
        response = await documentModel.deleteDocument(documentId);
        expect(response).toEqual(1);
        
        done();
    });
    test('periodically best document test', async (done) => {
        let response = await request.get('/best').set(headers);
        expect(response.statusCode).toEqual(401);
        
        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };
        
        response = await request.get('/best').set(headers_local);
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'boardType');
        
        response = await request.get('/best').set(headers_local).query({boardType:'L'});
        expect(response.statusCode).toEqual(200);
        expect(response.body).toHaveProperty('today');
        expect(response.body).toHaveProperty('week');
        expect(response.body).toHaveProperty('month');
        
        done();
    });
    test('/survey test', async (done) => {
        expect(1).toEqual(1);
        done();
    });
})
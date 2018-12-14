/* global expect */
const app = require('../../app'),
    request = require('supertest')(app),
    userModel = require('../../server/models/userModel'),
    documentModel = require('../../server/models/documentModel'),
    commentModel = require('../../server/models/commentModel'),
    boardModel = require('../../server/models/boardModel')
const headers = { 'Accept': 'application/json' };
describe('Test the vote path', async () => {

    test('document vote create test', async (done) => {
        let response = await request.post('/vote/document').set(headers);
        expect(response.statusCode).toEqual(401);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'orange', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        response = await request.post('/vote/document').set(headers_local)
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId')
        response = await request.post('/vote/document').set(headers_local).send({ documentId: '123asdf' })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId')
        response = await request.post('/vote/document').set(headers_local).send({ documentId: 1231234 })
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'documentId')

        let document = await documentModel.getDocuments('nofree');
        expect(document.length).toBeGreaterThan(0);
        response = await boardModel.checkUserBoardReadable('orange', 'nofree');
        expect(response[0]).toHaveProperty('count', 0);
        response = await request.post('/vote/document').set(headers_local).send({ documentId: document[0].documentId });
        expect(response.statusCode).toEqual(403);
        expect(response.body).toHaveProperty('target', 'documentId')

        response = await request.post('/document').set(headers_local).send({ boardId: 'free', isAnonymous: true, title: 'asdf', contents: 'asdfasdf', allowAnonymous: false });
        expect(response.statusCode).toEqual(200);
        expect(response.body.documentId).toBeGreaterThan(0);
        let documentId = response.body.documentId;

        response = await request.post('/vote/document').set(headers_local).send({ documentId: documentId });
        expect(response.statusCode).toEqual(200);
        expect(response.body.voteUpCount).toBeGreaterThan(0);
        response = await request.post('/vote/document').set(headers_local).send({ documentId: documentId });
        expect(response.statusCode).toEqual(409);

        response = await documentModel.deleteDocument(documentId);
        expect(response).toEqual(1);

        response = await request.post('/document').set(headers_local).send({ boardId: 'free', isAnonymous: true, title: 'asdf', contents: 'asdfasdf', allowAnonymous: false });
        expect(response.statusCode).toEqual(200);
        expect(response.body.documentId).toBeGreaterThan(0);
        documentId = response.body.documentId;
        let i = 0;
        while (i < 14) {
            await documentModel.updateDocumentVote(documentId, true);
            i++;
        }
        response = await request.post('/vote/document').set(headers_local).send({ documentId: documentId });
        expect(response.statusCode).toEqual(200);
        expect(response.body.voteUpCount).toEqual(15);

        response = await documentModel.getDocument(documentId);
        expect(response.length).toBeGreaterThan(0);
        expect(response[0]).toHaveProperty('bestDateTime');

        response = await documentModel.deleteDocument(documentId);
        expect(response).toEqual(1);

        done();
    })
    test('comment vote create test', async (done) => {
        let response = await request.post('/vote/comment').set(headers);
        expect(response.statusCode).toEqual(401);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'orange', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        response = await request.post('/vote/comment').set(headers_local)
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'commentId')
        response = await request.post('/vote/comment').set(headers_local).send({ commentId: '123asdf' })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'commentId')
        response = await request.post('/vote/comment').set(headers_local).send({ commentId: 1231234 })
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'commentId')

        let document = await documentModel.getDocuments('nofree');
        expect(document.length).toBeGreaterThan(0);
        document = document.find(x=>x.commentCount > 0);
        if(document){
            response = await commentModel.getComments(document.documentId);
            expect(response.length).toBeGreaterThan(0);
            let comment = response[0];
            response = await request.post('/vote/comment').set(headers_local).send({ commentId: comment.commentId });
            expect(response.statusCode).toEqual(403);
            expect(response.body).toHaveProperty('target', 'documentId')
        }

        response = await request.post('/document').set(headers_local).send({ boardId: 'free', isAnonymous: true, title: 'asdf', contents: 'asdfasdf', allowAnonymous: false });
        expect(response.statusCode).toEqual(200);
        expect(response.body.documentId).toBeGreaterThan(0);
        let documentId = response.body.documentId;
        response = await request.post('/comment').set(headers_local).send({ documentId: documentId, isAnonymous: true, contents: 'contents!!!!' })
        expect(response.statusCode).toEqual(200);
        let commentId = response.body.commentId;

        response = await request.post('/vote/comment').set(headers_local).send({ commentId: commentId });
        expect(response.statusCode).toEqual(200);
        response = await request.post('/vote/comment').set(headers_local).send({ commentId: commentId });
        expect(response.statusCode).toEqual(409);

        response = await commentModel.deleteComment(commentId);
        expect(response).toEqual(1);

        done();
    })

})
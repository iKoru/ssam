/* global expect */
const app = require('../../app'),
    request = require('supertest')(app),
    userModel = require('../../server/models/userModel'),
    headers = { 'Accept': 'application/json' };

describe('Test the notification path', async () => {
    test('notification crud test', async (done) => {
        //create notification
        let response = await request.get('/notification').set(headers);
        expect(response.statusCode).toEqual(401);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = { ...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'orange', status: 'AUTHORIZED' });
        expect(response).toEqual(1);
        response = await request.get('/notification').set(headers_local);
        expect(response.statusCode).toEqual(200);
        const originalLength = response.body.length;

        response = await request.post('/document').set(headers_local).send({ boardId: 'free', title: 'notificationTest', contents: 'notification test!!!', isAnonymous: true, allowAnonymous: true })
        expect(response.statusCode).toEqual(200);
        expect(response.body).toHaveProperty('documentId');

        let documentId = response.body.documentId;
        expect(documentId).toBeGreaterThan(0);

        response = await request.post('/comment').set(headers_local).send({ documentId: documentId, contents: 'notification test comment!!!', isAnonymous: true })
        expect(response.statusCode).toEqual(200);
        expect(response.body).toHaveProperty('commentId');
        let commentId = response.body.commentId;
        expect(commentId).toBeGreaterThan(0);

        //no notification when create acomment on self-written document
        response = await request.get('/notification').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toEqual(originalLength);

        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local2 = { ...headers, 'x-auth': response.body.token };
        response = await userModel.updateUserInfo({ userId: 'blue', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        //notification created when other user commented on its document
        response = await request.post('/comment').set(headers_local2).send({ documentId: documentId, contents: 'notification test commentggg!!!', isAnonymous: true })
        expect(response.statusCode).toEqual(200);
        let commentIds = [response.body.commentId];

        setTimeout(async () => {
            response = await request.get('/notification').set(headers_local);
            expect(response.statusCode).toEqual(200);
            if (originalLength < 10) {
                expect(response.body.length).toEqual(originalLength + 1);
            }

            //update notification when not read
            response = await request.post('/comment').set(headers_local2).send({ documentId: documentId, contents: 'notification test commentg22gg!!!', isAnonymous: true })
            expect(response.statusCode).toEqual(200);
            commentIds.push(response.body.commentId);

            response = await request.get('/notification').set(headers_local);
            expect(response.statusCode).toEqual(200);
            if (originalLength < 10) {
                expect(response.body.length).toEqual(originalLength + 1);
            }

            response = await request.post('/comment').set(headers_local2).send({ documentId: documentId, parentCommentId: commentId, contents: 'notification test child commentg22gg!!!', isAnonymous: true })
            expect(response.statusCode).toEqual(200);
            commentIds.push(response.body.commentId);
            setTimeout(async () => {

                response = await request.get('/notification').set(headers_local);
                expect(response.statusCode).toEqual(200);
                if (originalLength < 9) {
                    expect(response.body.length).toEqual(originalLength + 2);
                }

                //update notification
                let notifications = response.body;
                response = await request.put('/notification').set(headers_local).send({ notificationId: notifications[0].notificationId, isRead: true })
                expect(response.statusCode).toEqual(200);

                response = await request.put('/notification').set(headers_local).send({ clearNotification: true })
                expect(response.statusCode).toEqual(200);

                //delete notification
                let i = 0;
                while (i < notifications.length) {
                    response = await request.delete('/notification/' + notifications[i].notificationId).set(headers_local);
                    expect(response.statusCode).toEqual(200);
                    i++;
                }
                response = await request.delete('/comment/' + commentIds[2]).set(headers_local2);
                expect(response.statusCode).toEqual(200);
                response = await request.delete('/comment/' + commentIds[1]).set(headers_local2);
                expect(response.statusCode).toEqual(200);
                response = await request.delete('/comment/' + commentIds[0]).set(headers_local2);
                expect(response.statusCode).toEqual(200);
                response = await request.delete('/comment/' + commentId).set(headers_local2);
                expect(response.statusCode).toEqual(200);
                response = await request.delete('/document/' + documentId).set(headers_local2);
                expect(response.statusCode).toEqual(200);
                response = await userModel.updateUserInfo({ userId: 'blue', status: 'NORMAL' });
                expect(response).toEqual(1);
                response = await userModel.updateUserInfo({ userId: 'orange', status: 'NORMAL' });
                expect(response).toEqual(1);
                done();
            }, 500);

        }, 500);
    });
})
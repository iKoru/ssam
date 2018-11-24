/* global expect */
const app = require('../../app'),
    request = require('supertest')(app),
    messageModel = require('../../server/models/messageModel'),
    userModel = require('../../server/models/userModel')
const headers = { 'Accept': 'application/json' };
describe('Test the message path', async() => {
    test('get chat list test', async(done) => {
        let response = await request.get('/message/list').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await request.get('/message/list').set(headers_local).query({ chatType: 'aa' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'chatType');

        response = await request.get('/message/list').set(headers_local).query({ chatType: 'L', page: 'aa' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'page');

        response = await request.get('/message/list').set(headers_local).query({ chatType: 'L' });
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);

        response = await request.get('/message/list').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);

        done()
    })

    test('create, delete chat test', async(done) => {
        let response = await request.post('/message/list').set(headers);
        expect(response.statusCode).toEqual(403);
        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await request.get('/message/list').set(headers_local);
        expect(response.statusCode).toEqual(200);
        const originalCount = response.body.length;

        response = await request.post('/message/list').set(headers_local).send({});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'nickName');
        response = await request.post('/message/list').set(headers_local).send({ nickName: {} });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'nickName');
        response = await request.post('/message/list').set(headers_local).send({ nickName: '' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'nickName');
        response = await request.post('/message/list').set(headers_local).send({ nickName: 'aa' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'chatType');
        response = await request.post('/message/list').set(headers_local).send({ nickName: 'aa', chatType: 'aa' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'chatType');
        response = await request.post('/message/list').set(headers_local).send({ nickName: 'aa', chatType: 'L' });
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'nickName');

        const blue = await userModel.getUser('blue');
        expect(blue).toHaveLength(1);
        response = await request.post('/message/list').set(headers_local).send({ nickName: blue[0].loungeNickName, chatType: 'L' });
        expect(response.statusCode).toEqual(409);

        //create if not exists.
        response = await request.post('/user').set(headers).send({ userId: 'blue2', password: 'xptmxm1!', email: 'blue2@sen.go.kr' })
        const other = await userModel.getUser('blue2');
        expect(other.length).toEqual(1);

        response = await request.post('/message/list').set(headers_local).send({ nickName: other[0].topicNickName, chatType: 'T' })
        expect(response.statusCode).toEqual(200);
        const chatId = response.body.chatId;
        expect(chatId).toBeGreaterThan(0);

        //delete chat
        response = await request.delete('/message/').set(headers_local);
        expect(response.statusCode).toEqual(404);
        response = await request.delete('/message/aaa' + chatId).set(headers_local);
        expect(response.statusCode).toEqual(404);

        //not allowed to delete chat if not participated
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        response = await request.delete('/message/' + chatId).set({...headers, 'x-auth': response.body.token });
        expect(response.statusCode).toEqual(403);

        response = await request.delete('/message/' + chatId).set(headers_local);
        expect(response.statusCode).toEqual(200);

        response = await messageModel.getChat(chatId);
        expect(response.length).toEqual(1);
        expect(response[0].user1Status).toEqual('DELETED');

        response = await request.get('/message/list').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toEqual(originalCount);

        response = await request.post('/signin').set(headers).send({ userId: 'blue2', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        response = await request.delete('/message/' + chatId).set({...headers, 'x-auth': response.body.token });
        expect(response.statusCode).toEqual(200);

        response = await messageModel.getChat(chatId);
        expect(response.length).toEqual(0);
        done()
    })
    test('message create and get test', async(done) => {
        let response = await request.post('/signin').set(headers).send({ userId: 'blue2', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        const other = await userModel.getUser('blue');
        expect(other.length).toEqual(1);

        response = await request.post('/message/list').set(headers_local).send({ nickName: other[0].topicNickName, chatType: 'T' });
        let chatId;
        if (response.statusCode === 200 || response.statusCode === 409) {
            chatId = response.body.chatId;
        } else {
            expect(response.statusCode).toEqual(200); //error
        }

        response = await request.post('/message').set(headers_local);
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'chatId');
        response = await request.post('/message').set(headers_local).send({ chatId: '' })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'chatId');
        response = await request.post('/message').set(headers_local).send({ chatId: {} })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'chatId');
        response = await request.post('/message').set(headers_local).send({ chatId: 99999999999999, contents: 'a' })
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'chatId');
        response = await request.post('/message').set(headers_local).send({ chatId: chatId })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'contents');
        response = await request.post('/message').set(headers_local).send({ chatId: chatId, contents: {} })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'contents');

        const otherChat = await messageModel.getChats('orange', 'blue');
        expect(otherChat.length).toBeGreaterThan(0)
        response = await request.post('/message').set(headers_local).send({ chatId: otherChat[0].chatId, contents: 'hello from blue2' })
        expect(response.statusCode).toEqual(403);
        expect(response.body).toHaveProperty('target', 'chatId');
        response = await request.post('/message').set(headers_local).send({ chatId: chatId, contents: 'hello from blue2' });
        expect(response.statusCode).toEqual(200);

        response = await messageModel.updateChat(chatId, 'blue', 'DELETED');
        expect(response).toEqual(1);
        response = await request.post('/message').set(headers_local).send({ chatId: chatId, contents: 'hello from blue2' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'chatId');
        response = await messageModel.updateChat(chatId, 'blue', 'NORMAL');
        expect(response).toEqual(1);

        done();
    })
})
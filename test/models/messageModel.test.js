/* global expect */
const messageModel = require('../../server/models/messageModel');
const util = require('../../server/util');

// test('create chats - init', async (done) => {
//     expect(await messageModel.createChat('orange', 'blue', 'L')).toHaveProperty('rowCount', 1);
//     done();
// });

test('get chats', async (done) => {
    expect(await messageModel.getChats('orange')).toHaveLength(1);
    expect(await messageModel.getChats()).toHaveLength(0);
    expect((await messageModel.getChats('blue')).length).toBeGreaterThan(0);
    expect(await messageModel.getChats('orange', 'blue')).toHaveLength(1);
    expect(await messageModel.getChats('orange', 'orange2')).toHaveLength(0);
    expect(await messageModel.getChats('blue2', 'orange2')).toHaveLength(0);
    done();
});

test('get chat', async (done) => {
    const chat = await messageModel.getChats('orange', 'blue');
    expect(chat.length).toEqual(1);
    expect(await messageModel.getChat(chat[0].chatId)).toHaveLength(1);
    done();
});

test('update chat', async (done) => {
    let chat = await messageModel.getChats('orange', 'blue');
    expect(chat[0].user1Status).toEqual('NORMAL');
    expect(await messageModel.updateChat(chat[0].chatId, 'orange', 'DELETED')).toEqual(1);
    chat = await messageModel.getChat(chat[0].chatId);
    expect(chat[0].user1Status).toEqual('DELETED');
    expect(await messageModel.updateChat(chat[0].chatId, 'orange', 'NORMAL')).toEqual(1);
    done();
});

test('create and get message', async (done) => {
    const chat = await messageModel.getChats('orange', 'blue');
    expect(await messageModel.createMessage(chat[0].chatId, 'orange', 'hello from orange')).toEqual(1);
    expect(await messageModel.createMessage(chat[0].chatId, 'blue', 'hello from blue')).toEqual(1);
    expect((await messageModel.getMessages(chat[0].chatId, util.getYYYYMMDDHH24MISS())).length).toBeGreaterThan(1);
    done();
});

test('create and delete Chat', async (done) => {
    const chat = await messageModel.createChat('orange', 'blue', 'T');
    expect(chat.rowCount).toEqual(1);
    expect(await messageModel.deleteChat(chat.rows[0].chatId)).toEqual(1);
    done();
});
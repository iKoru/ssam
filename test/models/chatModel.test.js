/* global expect */
const chatModel = require('../../server/models/chatModel');
const util = require('../../server/util');

// test('create chats - init', async() => {
//     expect(await chatModel.createChat('orange', 'blue', 'L')).toEqual(1);
// });

test('get chats', async() => {
    expect(await chatModel.getChats('orange')).toHaveLength(1);
    expect(await chatModel.getChats()).toHaveLength(0);
    expect(await chatModel.getChats('blue')).toHaveLength(1);
    expect(await chatModel.getChats('orange', 'blue')).toHaveLength(1);
    expect(await chatModel.getChats('orange', 'orange2')).toHaveLength(0);
    expect(await chatModel.getChats('blue2', 'orange2')).toHaveLength(0);
});

test('get chat', async() => {
    const chat = await chatModel.getChats('orange', 'blue');
    expect(chat.length).toEqual(1);
    expect(await chatModel.getChat(chat[0].chatId)).toHaveLength(1);
});

test('update chat', async() => {
    let chat = await chatModel.getChats('orange', 'blue');
    expect(chat[0].user1Status).toEqual('NORMAL');
    expect(await chatModel.updateChat(chat[0].chatId, 'orange', 'DELETED')).toEqual(1);
    chat = await chatModel.getChat(chat[0].chatId);
    expect(chat[0].user1Status).toEqual('DELETED');
    expect(await chatModel.updateChat(chat[0].chatId, 'orange', 'NORMAL')).toEqual(1);
});

test('create and get message', async() => {
    const chat = await chatModel.getChats('orange', 'blue');
    expect(await chatModel.createMessage(chat[0].chatId, 'orange', 'hello from orange')).toEqual(1);
    expect(await chatModel.createMessage(chat[0].chatId, 'blue', 'hello from blue')).toEqual(1);
    expect((await chatModel.getMessages(chat[0].chatId, util.getYYYYMMDDHH24MISS())).length).toBeGreaterThan(1);
});

test('create and delete Chat', async() => {
    const chat = await chatModel.createChat('orange', 'blue', 'T');
    expect(chat.rowCount).toEqual(1);
    expect(await chatModel.deleteChat(chat.rows[0].chatId)).toEqual(1);
});
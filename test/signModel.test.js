const signModel = require('../server/models/signModel');

test('create signin log', async() => {
    expect(await signModel.createSigninLog('test', '127.0.0.1', false)).toEqual(1);
});
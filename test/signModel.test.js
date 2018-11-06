const signModel = require('../server/models/signModel');

test('create signin log', async () => {
    expect(await signModel.createSigninLog('orange', '127.0.0.1', false)).toEqual(1)
});

test('select signin log', async () => {
   expect(await signModel.getSigninLog('test', '20181001', '20181231')).toEqual([])
});
const signModel = require('../server/models/signModel');

test('create signin log(not registered userId -> error)', async () => {
    expect(await signModel.createSigninLog('test', '127.0.0.1', false)).toBeUndefined()
});

test('select signin log', async () => {
   expect(await signModel.getSigninLog('test', '20181001', '20181231')).toEqual([])
});
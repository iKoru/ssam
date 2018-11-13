const signModel = require('../../server/models/signModel');

test('create signin log', async(done) => {
    expect(await signModel.createSigninLog('orange', '127.0.0.1', false)).toEqual(1)
    done();
});

test('select signin log', async(done) => {
    expect(await signModel.getSigninLog('test', '20181001', '20181231')).toEqual([])
    done();
});
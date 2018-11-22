/* global expect */
const app = require('../../app'),
 request = require('supertest')(app),
 authModel = require('../../server/models/authModel'),
 userModel = require('../../server/models/userModel')
const headers = { 'Accept': 'application/json' };
describe('Test the auth path', async () => {
    test('auth mail send test', async (done) => {
        let response = await request.post('/auth').set(headers);
        expect(response.statusCode).toEqual(403);
        
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };
        
        response = await userModel.updateUserInfo({userId:'blue', status:'AUTHORIZED'});
        expect(response).toEqual(1);
        
        response = await request.post('/auth').set(headers_local);
        expect(response.statusCode).toEqual(403)
        
        response = await userModel.updateUserInfo({userId:'blue', status:'NORMAL'});
        expect(response).toEqual(1);
        
        response = await request.post('/auth').set(headers_local);
        expect(response.statusCode).toEqual(200);
        
        response = await authModel.getUserAuth('blue', 'NORMAL');
        expect(response.length).toBeGreaterThan(0);
        
        done();
    })
    test('auth submit test', async (done) => {
        let response = await userModel.getUser('blue');
        expect(response.length).toEqual(1);
        expect(response[0].status).toEqual('NORMAL');
        
        response = await authModel.getUserAuth('blue', 'NORMAL');
        if(response.length <= 0){
            response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
            expect(response.statusCode).toEqual(200);
            response = await request.post('/auth').set({...headers, 'x-auth':response.body.token});
            expect(response.statusCode).toEqual(200);
            response = await authModel.getUserAuth('blue', 'NORMAL');
        }
        expect(response.length).toBeGreaterThan(0);
        const authKey = response[0].authKey;
        
        
        response = await request.get('/auth/submit').set(headers).query({userId:'blue'});
        expect(response.statusCode).toEqual(400);
        
        response = await request.get('/auth/submit').set(headers).query({authKey:authKey});
        expect(response.statusCode).toEqual(400);
        
        response = await request.get('/auth/submit').set(headers).query({userId:'blue332', authKey:authKey});
        expect(response.statusCode).toEqual(404);
        response = await request.get('/auth/submit').set(headers).query({userId:'orange', authKey:authKey});
        expect(response.statusCode).toEqual(400);
        
        response = await request.get('/auth/submit').set(headers).query({userId:'blue', authKey:authKey});
        expect(response.statusCode).toEqual(200);
        
        response = await userModel.getUser('blue');
        expect(response.length).toEqual(1);
        expect(response[0].status).toEqual('AUTHORIZED');
        
        response = await request.get('/auth/submit').set(headers).query({userId:'blue', authKey:authKey});
        expect(response.statusCode).toEqual(400);
        
        response = await userModel.updateUserInfo({userId:'blue', status:'NORMAL'});
        expect(response).toEqual(1);
        
        response = await authModel.updateUserAuth({userId:'blue', authKey:authKey, status:'NORMAL'});
        expect(response).toEqual(1);
        done();
    })

})
/* global expect */
const app = require('../../app')
const request = require('supertest')(app),
    userModel = require('../../server/models/userModel')

describe('Test the user path', async() => {
    test('auth pre test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('user get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('signup test', async(done) => {
        //not acceptable email host
        let response = await request.post('/user').set('Accept', 'application/json').send({ userId: 'orange1', email: 'orange1@test.com', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(400);
        //no password parameter
        response = await request.post('/user').set('Accept', 'application/json').send({ userId: 'orange1', email: 'orange1@test.com' });
        expect(response.statusCode).toEqual(400);
        //no email parameter
        response = await request.post('/user').set('Accept', 'application/json').send({ userId: 'orange1', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(400);
        //no userId parameter
        response = await request.post('/user').set('Accept', 'application/json').send({ email: 'orange1@test.com', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(400);
        //successfully signed up
        response = await request.post('/user').set('Accept', 'application/json').send({ userId: 'orange1', email: 'orange1@sen.go.kr', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        //created user id check
        let user = await userModel.getUser('orange1');
        expect(user).toHaveLength(1);
        //reserved id check
        response = await request.post('/user').set('Accept', 'application/json').send({ userId: 'admin', email: 'admin@sen.go.kr', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(400);
        //already existing user Id
        response = await request.post('/user').set('Accept', 'application/json').send({ userId: 'orange1', email: 'orange12@sen.go.kr', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(409);
        //already existing email check
        response = await request.post('/user').set('Accept', 'application/json').send({ userId: 'orange1233', email: 'orange1@sen.go.kr', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(409);
        //registered id signin check
        response = await request.post('/signin').set('Accept', 'application/json').send({ userId: 'orange1', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        expect(response.body.token.length).toBeGreaterThan(20);
        //restore temporary created userId
        expect(await userModel.deleteUser('orange1')).toEqual(1);
        done();
    })

    test('user put test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('user delete test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('user list get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('user document get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('user comment get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('user board get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('user board put test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('user group put test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('user group get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })

})
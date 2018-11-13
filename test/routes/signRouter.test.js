/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the root path', () => {
    let jwt;
    test('signin test', async(done) => {
        let response = await request(app).get('/');
        expect(response.statusCode).toBe(307);
        response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!!' });
        expect(response.statusCode).toBe(400);
        response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        jwt = response.body;
        expect(jwt.length).toBeGreaterThan(10);
        done();
    })

    test('signup test', async(done) => {

        done();
    })

    test('resetPassword test', async(done) => {
        done();
    })

    test('refresh token test', async(done) => {
        done();
    });
})
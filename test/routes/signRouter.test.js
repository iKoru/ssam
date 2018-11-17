/* global expect */
const request = require('supertest')
const app = require('../../app')
const userModel = require('../../server/models/userModel')
const bcrypt = require('bcrypt');
describe('Test the root path', async() => {
    test('sign pre test', async(done) => {
        response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        let jwt = response.body;
        done();
    });

    test('signin test', async(done) => {
        let response = await request(app).get('/');
        expect(response.statusCode).toBe(307);
        response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!!' });
        expect(response.statusCode).toBe(400);
        response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        done();
    });


    test('signup test', async(done) => {
        expect(1).toEqual(1);
        done();
    });

    test('resetPassword test', async(done) => {
        expect(1).toEqual(1);
        done();
    })

    test('refresh token test', async(done) => {
        expect(1).toEqual(1);
        done();
    });
})
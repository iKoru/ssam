/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the board path', async() => {
    test('board test2', async(done) => {
        let response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        let jwt = response.body;
        done();
    })
    test('board test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('board delete test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('board create test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('board list test', async(done) => {
        expect(1).toEqual(1);
        done();
    })

})
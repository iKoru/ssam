/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the group path', async() => {
    test('group pre test', async(done) => {
        let response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        let jwt = response.body;
        done();
    })
    test('group get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('group delete test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('group create test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('group put test', async(done) => {
        expect(1).toEqual(1);
        done();
    })

})
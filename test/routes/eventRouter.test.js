/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the event path', async() => {
    test('event pre test', async(done) => {
        let response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        let jwt = response.body;
        done();
    })
    test('event get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('event delete test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('event create test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('event put test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('event list get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })

})
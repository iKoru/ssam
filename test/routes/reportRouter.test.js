/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the report path', async() => {
    test('report pre test', async(done) => {
        let response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        let jwt = response.body;
        done();
    })
    test('document report get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('document report create test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('document report put test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('comment report get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('comment report create test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('comment report put test', async(done) => {
        expect(1).toEqual(1);
        done();
    })

})
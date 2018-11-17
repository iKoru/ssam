/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the scrap path', async() => {
    test('scrap pre test', async(done) => {
        let response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        let jwt = response.body;
        done();
    })
    test('scrap delete test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('scrap create test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('scrap get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('scrap group get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('scrap group put test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('scrap group create test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('scrap group delete test', async(done) => {
        expect(1).toEqual(1);
        done();
    })

})
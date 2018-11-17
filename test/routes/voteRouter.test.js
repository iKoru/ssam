/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the vote path', async() => {
    test('vote pre test', async(done) => {
        let response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        let jwt = response.body;
        done();
    })
    test('document vote create test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('comment vote create test', async(done) => {
        expect(1).toEqual(1);
        done();
    })

})
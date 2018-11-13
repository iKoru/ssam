/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the message path', () => {
    response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
    expect(response.statusCode).toBe(200);
    let jwt = response.body;
    test('message get test', async(done) => {

        done();
    })
    test('message delete test', async(done) => {

        done();
    })
    test('message create test', async(done) => {

        done();
    })


})
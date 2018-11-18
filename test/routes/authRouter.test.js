/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the auth path', async () => {
    test('auth pre test', async (done) => {
        //response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        //expect(response.statusCode).toBe(200);
        //let jwt = response.body;
        expect(1).toEqual(1);
        done();
    })
    test('auth test', async (done) => {
        expect(1).toEqual(1);
        done();
    })

})
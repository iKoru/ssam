 /* global expect */
 const request = require('supertest')
 const app = require('../../app')

 describe('Test the auth path', async() => {
     jest.useFakeTimers();
     response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
     expect(response.statusCode).toBe(200);
     let jwt = response.body;
     test('auth test', async(done) => {

         done();
     })

 })
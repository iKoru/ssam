 /* global expect */
 const request = require('supertest')
 const app = require('../../app')

 describe('Test the event path', () => {
     response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
     expect(response.statusCode).toBe(200);
     let jwt = response.body;
     test('event get test', async(done) => {

         done();
     })
     test('event delete test', async(done) => {

         done();
     })
     test('event create test', async(done) => {

         done();
     })
     test('event put test', async(done) => {

         done();
     })
     test('event list get test', async(done) => {

         done();
     })

 })
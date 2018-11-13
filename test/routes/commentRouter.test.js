 /* global expect */
 const request = require('supertest')
 const app = require('../../app')

 describe('Test the comment path', () => {
     response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
     expect(response.statusCode).toBe(200);
     let jwt = response.body;
     test('comment get test', async(done) => {

         done();
     })
     test('comment delete test', async(done) => {

         done();
     })
     test('comment create test', async(done) => {

         done();
     })
     test('comment put test', async(done) => {

         done();
     })

 })
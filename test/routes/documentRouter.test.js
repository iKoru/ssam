 /* global expect */
 const request = require('supertest')
 const app = require('../../app')

 describe('Test the document path', () => {
     response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
     expect(response.statusCode).toBe(200);
     let jwt = response.body;
     test('document get test', async(done) => {

         done();
     })
     test('document delete test', async(done) => {

         done();
     })
     test('document create test', async(done) => {

         done();
     })
     test('document put test', async(done) => {

         done();
     })

 })
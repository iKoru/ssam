 /* global expect */
 const request = require('supertest')
 const app = require('../../app')

 describe('Test the user path', () => {
     response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
     expect(response.statusCode).toBe(200);
     let jwt = response.body;
     test('user get test', async(done) => {

         done();
     })
     test('user create test', async(done) => {

         done();
     })
     test('user put test', async(done) => {

         done();
     })
     test('user delete test', async(done) => {

         done();
     })
     test('user list get test', async(done) => {

         done();
     })
     test('user document get test', async(done) => {

         done();
     })
     test('user comment get test', async(done) => {

         done();
     })
     test('user board get test', async(done) => {

         done();
     })
     test('user board put test', async(done) => {

         done();
     })
     test('user group put test', async(done) => {

         done();
     })
     test('user group get test', async(done) => {

         done();
     })

 })
 /* global expect */
 const request = require('supertest')
 const app = require('../../app')

 describe('Test the report path', () => {
     response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
     expect(response.statusCode).toBe(200);
     let jwt = response.body;
     test('document report get test', async(done) => {

         done();
     })
     test('document report create test', async(done) => {

         done();
     })
     test('document report put test', async(done) => {

         done();
     })
     test('comment report get test', async(done) => {

         done();
     })
     test('comment report create test', async(done) => {

         done();
     })
     test('comment report put test', async(done) => {

         done();
     })

 })
 /* global expect */
 const request = require('supertest')
 const app = require('../../app')

 describe('Test the board path', () => {
     response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
     expect(response.statusCode).toBe(200);
     let jwt = response.body;
     test('board test', async(done) => {

         done();
     })
     test('board delete test', async(done) => {

         done();
     })
     test('board create test', async(done) => {

         done();
     })
     test('board list test', async(done) => {

         done();
     })

 })
 /* global expect */
 const request = require('supertest')
 const app = require('../../app')

 describe('Test the main path', () => {
     response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
     expect(response.statusCode).toBe(200);
     let jwt = response.body;
     test('index test', async(done) => {

         done();
     })

     test('main test', async(done) => {

         done();
     })

     test('profile test', async(done) => {
         done();
     })

     test('board list test', async(done) => {
         done();
     });
     test('board/document test', async(done) => {
         done();
     });
     test('/document test', async(done) => {
         done();
     });
     test('/survey test', async(done) => {
         done();
     });
     test('/notification test', async(done) => {
         done();
     });
 })
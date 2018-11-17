 /* global expect */
 const request = require('supertest')
 const app = require('../../app')

 describe('Test the scrap path', async() => {
     jest.useFakeTimers();
     response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
     expect(response.statusCode).toBe(200);
     let jwt = response.body;
     test('scrap delete test', async(done) => {

         done();
     })
     test('scrap create test', async(done) => {

         done();
     })
     test('scrap get test', async(done) => {

         done();
     })
     test('scrap group get test', async(done) => {

         done();
     })
     test('scrap group put test', async(done) => {

         done();
     })
     test('scrap group create test', async(done) => {

         done();
     })
     test('scrap group delete test', async(done) => {

         done();
     })

 })
 /* global expect */
 const request = require('supertest')
 const app = require('../../app')

 describe('Test the group path', async() => {
     jest.useFakeTimers();
     response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
     expect(response.statusCode).toBe(200);
     let jwt = response.body;
     test('group get test', async(done) => {

         done();
     })
     test('group delete test', async(done) => {

         done();
     })
     test('group create test', async(done) => {

         done();
     })
     test('group put test', async(done) => {

         done();
     })

 })
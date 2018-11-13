/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the root path', () => {
    test('signin test', async(done) => {
        const response = await request(app).get('/');
        expect(response.statusCode).toBe(307);
        
        done();
    })
})


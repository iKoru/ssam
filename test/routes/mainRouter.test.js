/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the main path', async() => {
    test('main pre test', async(done) => {
        let response = await request(app).post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        let jwt = response.body;
        done();
    })
    test('index test', async(done) => {
        expect(1).toEqual(1);
        done();
    })

    test('main test', async(done) => {
        expect(1).toEqual(1);
        done();
    })

    test('profile test', async(done) => {
        expect(1).toEqual(1);
        done();
    })

    test('board list test', async(done) => {
        expect(1).toEqual(1);
        done();
    });
    test('board/document test', async(done) => {
        expect(1).toEqual(1);
        done();
    });
    test('/document test', async(done) => {
        expect(1).toEqual(1);
        done();
    });
    test('/survey test', async(done) => {
        expect(1).toEqual(1);
        done();
    });
    test('/notification test', async(done) => {
        expect(1).toEqual(1);
        done();
    });
})
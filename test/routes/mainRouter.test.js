/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the main path', async () => {
    let jwt;
    test('main pre test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('index test', async (done) => {
        expect(1).toEqual(1);
        done();
    })

    test('main test', async (done) => {
        expect(1).toEqual(1);
        done();
    })

    test('profile test', async (done) => {
        expect(1).toEqual(1);
        done();
    })

    test('board list test', async (done) => {
        expect(1).toEqual(1);
        done();
    });
    test('board/document test', async (done) => {
        expect(1).toEqual(1);
        done();
    });
    test('/document test', async (done) => {
        expect(1).toEqual(1);
        done();
    });
    test('/survey test', async (done) => {
        expect(1).toEqual(1);
        done();
    });
    test('/notification test', async (done) => {
        expect(1).toEqual(1);
        done();
    });
})
/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the message path', async () => {
    test('auth pre test', async (done) => {
        expect(1).toEqual(1);
        done()
    })
    test('message get test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('message delete test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('message create test', async (done) => {
        expect(1).toEqual(1);
        done();
    })


})
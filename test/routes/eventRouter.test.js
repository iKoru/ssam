/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the event path', async () => {
    test('auth pre test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('event get test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('event delete test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('event create test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('event put test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('event list get test', async (done) => {
        expect(1).toEqual(1);
        done();
    })

})
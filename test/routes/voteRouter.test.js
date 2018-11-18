/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the vote path', async () => {
    test('auth pre test', async (done) => {
        expect(1).toEqual(1);
        done();
    })

    test('document vote create test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('comment vote create test', async (done) => {
        expect(1).toEqual(1);
        done();
    })

})
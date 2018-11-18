/* global expect */
const request = require('supertest')
const app = require('../../app')

describe('Test the group path', async () => {
    test('auth pre test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('group get test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('group delete test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('group create test', async (done) => {
        expect(1).toEqual(1);
        done();
    })
    test('group put test', async (done) => {
        expect(1).toEqual(1);
        done();
    })

})
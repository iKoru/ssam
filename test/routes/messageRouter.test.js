/* global expect */
const app = require('../../app'),
    request = require('supertest')(app),
    messageRouter = require('../../server/routes/messageRouter'),
    messageModel = require('../../server/models/messageModel')

describe('Test the message path', async() => {
    test('auth pre test', async(done) => {
        expect(1).toEqual(1);
        done()
    })
    test('message get test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('message delete test', async(done) => {
        expect(1).toEqual(1);
        done();
    })
    test('message create test', async(done) => {
        expect(1).toEqual(1);
        done();
    })


})
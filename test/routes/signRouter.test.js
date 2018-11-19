/* global expect */
const app = require('../../app'),
    request = require('supertest')(app),
    bcrypt = require('bcrypt'),
    userModel = require('../../server/models/userModel'),
    groupModel = require('../../server/models/groupModel')
    // test('signup init', async (done) => {
    //     //지역정보에 맞는 그룹을 넣어준다.
    //     expect(await groupModel.createGroup({
    //         groupName: '서울',
    //         groupDescription: '서울 지역에 해당하는 그룹',
    //         groupType: 'R',
    //         expirePeriod: -1,
    //         isOpenToUsers: true
    //     })).toHaveProperty('rowCount', 1);
    //     done();
    // });
describe('Test the root path', async() => {
    let jwt;
    test('signin test', async(done) => {
        await userModel.updateUserPassword({ userId: 'orange', password: await bcrypt.hash('xptmxm1!', 10) })
            //not authorized access
        let response = await request.get('/');
        expect(response.statusCode).toBe(307);
        //no password parameter
        response = await request.post('/signin').set('Accept', 'application/json').send({ userId: 'orange' });
        expect(response.statusCode).toBe(400);
        //no userId parameter
        response = await request.post('/signin').set('Accept', 'application/json').send({ password: 'orange' });
        expect(response.statusCode).toBe(400);
        //wrong password
        response = await request.post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!!!' });
        expect(response.statusCode).toBe(400);
        //successfully logged in
        response = await request.post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        //console.log(response);
        expect(response.statusCode).toBe(200);
        jwt = response.body;
        expect(jwt.length).toBeGreaterThan(20); //jwt toke check
        //change user status 
        expect(await userModel.updateUserInfo({ userId: 'orange', status: 'BLOCKED' })).toEqual(1)
            //user status check
        response = await request.post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(403);
        //restore user status
        expect(await userModel.updateUserInfo({ userId: 'orange', status: 'NORMAL' })).toEqual(1)

        done();
    })

    test('resetPassword test', async(done) => {
        //create temporary userId
        let response = await request.post('/user').set('Accept', 'application/json').send({ userId: 'orange1234', password: 'xptmxm1!', email: 'orange1234@sen.go.kr' });
        expect(response.statusCode).toBe(200);
        //signin check
        response = await request.post('/signin').set('Accept', 'application/json').send({ userId: 'orange1234', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        expect(response.body.length).toBeGreaterThan(20);
        //no email parameter check
        response = await request.post('/resetPassword').set('Accept', 'application/json').send({ userId: 'orange' });
        expect(response.statusCode).toBe(400);
        //not vaild email parameter check
        response = await request.post('/resetPassword').set('Accept', 'application/json').send({ userId: 'orange1234', email: 'aaa' })
        expect(response.statusCode).toBe(400);
        //no userId check
        response = await request.post('/resetPassword').set('Accept', 'application/json').send({ email: 'orange1234@sen.go.kr' })
        expect(response.statusCode).toBe(400);
        //not existing userId
        response = await request.post('/resetPassword').set('Accept', 'application/json').send({ userId: 'orange12345', email: 'aaa@orange.com' })
        expect(response.statusCode).toBe(404);
        //wrong email address
        response = await request.post('/resetPassword').set('Accept', 'application/json').send({ userId: 'orange1234', email: 'orange123@sen.go.kr' })
        expect(response.statusCode).toBe(400);
        //successfully change password and send email
        response = await request.post('/resetPassword').set('Accept', 'application/json').send({ userId: 'orange1234', email: 'orange1234@sen.go.kr' })
        expect(response.statusCode).toBe(200);
        //not able to sign in using previous password
        response = await request.post('/signin').set('Accept', 'application/json').send({ userId: 'orange1234', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(400);
        //delete temporary created userId
        expect(await userModel.deleteUser('orange1234')).toEqual(1);
        done();
    })

    test('refresh token test', async(done) => {
        //not authorized access
        let response = await request.get('/');
        expect(response.statusCode).toBe(307);
        response = await request.post('/signin').set('Accept', 'application/json').send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toBe(200);
        jwt = response.body;
        expect(jwt.length).toBeGreaterThan(20); //jwt token check
        response = await request.get('/').set('x-auth', jwt);
        expect(response.statusCode).toBe(501);
        done();
    });
})
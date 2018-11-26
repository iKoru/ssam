/* global expect */
const app = require('../../app'),
 request = require('supertest')(app),
 commentModel =require('../../server/models/commentModel'),
    userModel = require('../../server/models/userModel'),
    documentModel = require('../../server/models/documentModel'),
    boardModel = require('../../server/models/boardModel'),
    groupModel = require('../../server/models/groupModel')
const headers = { 'Accept': 'application/json' }; 
const qs = require('querystring');

describe('Test the comment path', async () => {
    // test('comment test - init', async(done) => {
    //     let response = await groupModel.getUserGroup('orange');
    //     expect(response.length).toBeGreaterThan(0);
    //     response = await boardModel.createBoardAuth('free', response[0].groupId);
    //     expect(response).toBeGreaterThanOrEqual(0);
    //     done()
    // })
    test('comment crud test', async (done) => {
        //create comment
        let response = await request.post('/comment').set(headers);
        expect(response.statusCode).toEqual(403);
        
        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };
        
        response = await userModel.updateUserInfo({userId:'orange', status:'AUTHORIZED'});
        expect(response).toEqual(1);
        response = await request.post('/comment').set(headers_local);
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId');
        
        response = await request.post('/comment').set(headers_local).send({documentId:'aaa'});
        expect(response.statusCode).toEqual(400)
        expect(response.body).toHaveProperty('target', 'documentId');
        
        response = await request.post('/comment').set(headers_local).send({documentId:123123, parentCommentId:'aa'});
        expect(response.statusCode).toEqual(400)
        expect(response.body).toHaveProperty('target', 'parentCommentId');
        response = await request.post('/comment').set(headers_local).send({documentId:123123, parentCommentId:123123 });
        expect(response.statusCode).toEqual(400)
        expect(response.body).toHaveProperty('target', 'isAnonymous');
        response = await request.post('/comment').set(headers_local).send({documentId:123123, parentCommentId:123123, isAnonymous:'aa'});
        expect(response.statusCode).toEqual(400)
        expect(response.body).toHaveProperty('target', 'isAnonymous');
        response = await request.post('/comment').set(headers_local).send({documentId:123123, parentCommentId:123123, isAnonymous:true});
        expect(response.statusCode).toEqual(400)
        expect(response.body).toHaveProperty('target', 'contents');
        response = await request.post('/comment').set(headers_local).send({documentId:123123, parentCommentId:123123, isAnonymous:true, contents:'contents!!!'});
        expect(response.statusCode).toEqual(404)
        expect(response.body).toHaveProperty('target', 'documentId');
        
        response = await documentModel.getDocuments('nofree');
        expect(response.length).toBeGreaterThan(0)
        
        let document = response[0];
        response = await request.post('/comment').set(headers_local).send({documentId:document.documentId, isAnonymous:true, contents:'contents!!!'})
        expect(response.statusCode).toEqual(403);
        expect(response.body).toHaveProperty('target', 'documentId');
        
        response = await documentModel.getDocuments('free');
        expect(response.length).toBeGreaterThan(0);
        document = response[0];
        response = await request.post('/comment').set(headers_local).send({documentId:document.documentId, isAnonymous:true, contents:'contents!!!!'})
        expect(response.statusCode).toEqual(200);
        
        let commentId = response.body.commentId;
        expect(commentId).toBeGreaterThan(0);
        
        response = await request.get('/comment').set(headers_local);
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId')
        response = await request.get('/comment').set(headers_local).query({documentId:123123});
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'documentId')
        response = await request.get('/comment').set(headers_local).query({documentId:123123, page:'aa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'page')
        
        response = await request.get('/comment').set(headers_local).query({documentId:document.documentId})
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body.filter(x=>x.commentId === commentId).length).toBeGreaterThan(0);
        
        //create child comment
        response = await request.post('/comment').set(headers_local).send({documentId:document.documentId, parentCommentId:commentId, isAnonymous:true, contents:'child contents!!!!'})
        expect(response.statusCode).toEqual(200);
        let childCommentId = response.body.commentId;
        
        response = await request.get('/comment').set(headers_local).query({documentId:document.documentId})
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        console.log(response.body);
        let children = [];
        response.body.filter(x=>x.childCount > 0).map(x=>{children.concat(x.children)});
        console.log(children);
        console.log(childCommentId);
        expect(children.filter(x=>x.commentId === childCommentId).length).toBeGreaterThan(0);
        
        response = await commentModel.getComment(commentId);
        expect(response.length).toEqual(1);
        expect(response[0]).toHaveProperty('childCount', 1);
        
        //update test
        response = await request.put('/comment').set(headers_local).send();
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'commentId')
        
        response = await request.put('/comment').set(headers_local).send({commentId:commentId});
        expect(response.statusCode).toEqual(400);
        
        response = await request.put('/comment').set(headers_local).send({commentId:commentId, isDeleted:'aa', contents:'changed contents!!!'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'isDeleted');
        //no changes
        response = await request.put('/comment').set(headers_local).send({commentId:commentId, isDeleted:false, contents:'contents!!!!'});
        expect(response.statusCode).toEqual(400);
        response = await request.put('/comment').set(headers_local).send({commentId:commentId, isDeleted:true, contents:'changed contents!!!!'});
        expect(response.statusCode).toEqual(200);
        
        response = await commentModel.getComment(commentId);
        expect(response.length).toEqual(1);
        expect(response[0]).toHaveProperty('isDeleted', true)
        
        response = await request.get('/comment').set(headers_local).query({documentId:document.documentId})
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body.filter(x=>x.commentId === commentId).length).toBeGreaterThan(0);
        expect(response.body.filter(x=>x.commentId === commentId)[0].contents).toEqual('삭제된 댓글입니다.');
        
        //impossible to create child comment when parent comment is deleted
        response = await request.post('/comment').set(headers_local).send({documentId:document.documentId, parentCommentId:commentId, isAnonymous:true, contents:'child contents!!!!'})
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'parentCommentId');
        
        response = await request.delete('/comment').set(headers_local);
        expect(response.statusCode).toEqual(404);
        response = await request.delete('/comment/'+commentId).set(headers_local);
        expect(response.statusCode).toEqual(403);
        
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        headers_local = {...headers, 'x-auth': response.body.token };
        
        response = await request.delete('/comment/'+123123).set(headers_local);
        expect(response.statusCode).toEqual(404);
        
        response = await request.delete('/comment/'+commentId).set(headers_local);
        expect(response.statusCode).toEqual(403);
        expect(response.body).toHaveProperty('target', 'childCount');
        response = await request.delete('/comment/'+childCommentId).set(headers_local);
        expect(response.statusCode).toEqual(200);
        response = await request.delete('/comment/'+commentId).set(headers_local);
        expect(response.statusCode).toEqual(200);
        
        done();
    })
    test('animalName crd test', async (done) => {
        //create animal name
        let response = await request.get('/comment/animal').set(headers);
        expect(response.statusCode).toEqual(403);
        
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await request.post('/comment/animal').set(headers_local);
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'animalNames')

        response = await request.post('/comment/animal').set(headers_local).send({animalNames:'캬캬캬'});
        expect(response.statusCode).toEqual(200);
        
        response = await request.post('/comment/animal').set(headers_local).send({animalNames:['캬캬','캬']});
        expect(response.statusCode).toEqual(200);
        
        //get animal name
        response = await request.get('/comment/animal').set(headers_local);;
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body.filter(x=> ['캬', '캬캬', '캬캬캬'].includes(x))).toHaveLength(3);
        
        response = await request.delete('/comment/animal').set(headers);
        expect(response.statusCode).toEqual(404);
        
        //delete animal Name
        response = await request.delete('/comment/animal/'+qs.escape('캬')).set(headers);
        expect(response.statusCode).toEqual(403);
        
        response = await request.delete('/comment/animal/'+qs.escape('캬')).set(headers_local);
        expect(response.statusCode).toEqual(200);
        response = await request.delete('/comment/animal/'+qs.escape('캬캬')).set(headers_local);
        expect(response.statusCode).toEqual(200);
        response = await request.delete('/comment/animal/'+qs.escape('캬캬캬')).set(headers_local);
        expect(response.statusCode).toEqual(200);
        
        done();
    })
    
})
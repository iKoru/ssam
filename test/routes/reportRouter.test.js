/* global expect */
const app = require('../../app'),
    request = require('supertest')(app),
    documentModel = require('../../server/models/documentModel'),
    userModel = require('../../server/models/userModel'),
    commentModel = require('../../server/models/commentModel'),
    reportModel = require('../../server/models/reportModel'),
    headers = { 'Accept': 'application/json' };

describe('Test the report path', async () => {
    
    test('document report crud test', async (done) => {
        let response = await request.post('/report/document').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'orange', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        const reportType = await reportModel.getReportType();
        expect(reportType.length).toBeGreaterThan(0);
        
        response = await request.post('/report/document').set(headers_local)
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId')
        response = await request.post('/report/document').set(headers_local).send({ documentId: '123asdf' })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId')
        response = await request.post('/report/document').set(headers_local).send({ documentId: 1231234, reportTypeId: "aaa"})
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'reportTypeId')
        response = await request.post('/report/document').set(headers_local).send({ documentId: 1231234, reportTypeId: 123})
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'documentId')

        let document = await documentModel.getDocuments('nofree');
        expect(document.length).toBeGreaterThan(0);
        response = await request.post('/report/document').set(headers_local).send({ documentId: document[0].documentId , reportTypeId:123});
        expect(response.statusCode).toEqual(403);
        expect(response.body).toHaveProperty('target', 'documentId')

        response = await request.post('/document').set(headers_local).send({ boardId: 'free', isAnonymous: true, title: 'asdfvotetest', contents: 'asdfasdfvotetest', allowAnonymous: false });
        expect(response.statusCode).toEqual(200);
        expect(response.body.documentId).toBeGreaterThan(0);
        let documentId = response.body.documentId;

        response = await request.post('/report/document').set(headers_local).send({ documentId: documentId,  reportTypeId:123123});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'reportTypeId')
        response = await request.post('/report/document').set(headers_local).send({ documentId: documentId,  reportTypeId:reportType[0].reportTypeId});
        expect(response.statusCode).toEqual(200);
        response = await request.post('/report/document').set(headers_local).send({ documentId: documentId, reportTypeId:reportType[0].reportTypeId });
        expect(response.statusCode).toEqual(409);


        response = await request.get('/report/document').set(headers_local).query({documentId:'aaa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId')
        response = await request.get('/report/document').set(headers_local).query({documentId:documentId});
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        headers_local = {...headers, 'x-auth': response.body.token };
        
        response = await request.put('/report/document').set(headers_local).send({documentId:'aaa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'documentId')
        response = await request.put('/report/document').set(headers_local).send({documentId:documentId, userId:{}});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'userId')
        response = await request.put('/report/document').set(headers_local).send({documentId:documentId, userId:'orange'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'status')
        response = await request.put('/report/document').set(headers_local).send({documentId:documentId, userId:'orange', status:'DELETED'});
        expect(response.statusCode).toEqual(200);
        
        response = await request.get('/report/document/list').set(headers_local).query({documentId:documentId});
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].status).toEqual('DELETED');
        
        response = await documentModel.deleteDocument(documentId);
        expect(response).toEqual(1);
        
        done();
    })
    test('comment report crud test', async (done) => {
        //create report
        let response = await request.post('/report/comment').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'orange', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await userModel.updateUserInfo({ userId: 'orange', status: 'AUTHORIZED' });
        expect(response).toEqual(1);

        const reportType = await reportModel.getReportType();
        expect(reportType.length).toBeGreaterThan(0);
        
        response = await request.post('/report/comment').set(headers_local)
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'commentId')
        response = await request.post('/report/comment').set(headers_local).send({ commentId: '123asdf' })
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'commentId')
        response = await request.post('/report/comment').set(headers_local).send({ commentId: 1231234, reportTypeId: "aaa"})
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'reportTypeId')
        response = await request.post('/report/comment').set(headers_local).send({ commentId: 1231234, reportTypeId: 123})
        expect(response.statusCode).toEqual(404);
        expect(response.body).toHaveProperty('target', 'commentId')

        response = await documentModel.getDocuments('free');
        expect(response.length).toBeGreaterThan(0);
        expect(response.body).toHaveProperty('target', 'documentId');
        
        //create new document to test
        response = await request.post('/document').set(headers_local).send({ boardId: 'free', isAnonymous: true, title: 'asdfreporttest', contents: 'asdfasdfreporttest', allowAnonymous: false });
        expect(response.statusCode).toEqual(200);
        let documentId = response.body.documentId;
        //create new comment to test
        response = await request.post('/comment').set(headers_local).send({ documentId: documentId, isAnonymous: true, contents: 'contents!!!' })
        expect(response.statusCode).toEqual(200);
        expect(response.body.documentId).toBeGreaterThan(0);
        let commentId = response.body.commentId;

        //create comment report
        response = await request.post('/report/comment').set(headers_local).send({ commentId: commentId,  reportTypeId:123123});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'reportTypeId')
        response = await request.post('/report/comment').set(headers_local).send({ commentId: commentId, reportTypeId:reportType[0].reportTypeId});
        expect(response.statusCode).toEqual(200);
        //duplicate comment error
        response = await request.post('/report/comment').set(headers_local).send({ commentId: commentId, reportTypeId:reportType[0].reportTypeId });
        expect(response.statusCode).toEqual(409);

        //get comment reports
        response = await request.get('/report/comment').set(headers_local).query({commentId:'aaa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'commentId')
        response = await request.get('/report/comment').set(headers_local).query({commentId:commentId});
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        
        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        headers_local = {...headers, 'x-auth': response.body.token };
        
        //put comment report
        response = await request.put('/report/comment').set(headers_local).send({commentId:'aaa'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'commentId')
        response = await request.put('/report/comment').set(headers_local).send({commentId:commentId, userId:{}});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'userId')
        response = await request.put('/report/comment').set(headers_local).send({commentId:commentId, userId:'orange'});
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'status')
        response = await request.put('/report/comment').set(headers_local).send({commentId:commentId, userId:'orange', status:'DELETED'});
        expect(response.statusCode).toEqual(200);
        
        response = await request.get('/report/comment/list').set(headers_local).query({commentId:commentId});
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].status).toEqual('DELETED');
        
        response = await commentModel.deleteComment(commentId);
        expect(response).toEqual(1);
        response = await documentModel.deleteDocument(documentId);
        expect(response).toEqual(1);
        
        done();
    })
    test('report type crud test', async (done) => {
        //create report type
        let response = await request.post('/report/type').set(headers);
        expect(response.statusCode).toEqual(403);

        response = await request.post('/signin').set(headers).send({ userId: 'blue', password: 'xptmxm1!' });
        expect(response.statusCode).toEqual(200);
        let headers_local = {...headers, 'x-auth': response.body.token };

        response = await request.post('/report/type').set(headers_local);
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'reportTypeName')

        response = await request.post('/report/type').set(headers_local).send({ reportTypeName: '캬캬캬' });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'reportTypeDescription')
        response = await request.post('/report/type').set(headers_local).send({ reportTypeName: '캬캬캬', reportTypeDescription:{} });
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'reportTypeDescription')
        response = await request.post('/report/type').set(headers_local).send({ reportTypeName: '캬캬캬', reportTypeDescription:'테스트 신고종류.'});
        expect(response.statusCode).toEqual(200);
        expect(response.body).toHaveProperty('reportTypeId');
        let reportTypeId = response.body.reportTypeId

        //get report type
        response = await request.get('/report/type').set(headers_local);
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body.filter(x => x.reportTypeName === '캬캬캬')).toHaveLength(1);

        //update report type
        response = await request.put('/report/type').set(headers_local);
        expect(response.statusCode).toEqual(400);
        expect(response.body).toHaveProperty('target', 'reportTypeId');
        response = await request.put('/report/type').set(headers_local).send({reportTypeId:reportTypeId})
        expect(response.statusCode).toEqual(400);
        response = await request.put('/report/type').set(headers_local).send({reportTypeId:reportTypeId, reportTypeName:'쿄쿄쿄'})
        expect(response.statusCode).toEqual(200);

        response = await request.get('/report/type').set(headers_local).query({reportTypeId:reportTypeId});
        expect(response.statusCode).toEqual(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body.filter(x => x.reportTypeName === '쿄쿄쿄')).toHaveLength(1);
        
        //delete report type
        response = await request.delete('/report/type/캬캬').set(headers);
        expect(response.statusCode).toEqual(404);

        response = await request.delete('/report/type/' + reportTypeId).set(headers_local);
        expect(response.statusCode).toEqual(200);
        
        done();
    })
    
})
/* global expect */
const reportModel = require('../../server/models/reportModel'),
    documentModel = require('../../server/models/documentModel'),
    commentModel = require('../../server/models/commentModel'),
    userModel = require('../../server/models/userModel');
const constants = require('../../server/constants');

// test('create report type - init', async (done) => {
//     expect(await reportModel.createReportType({
//         reportTypeName: '욕설',
//         reportTypeDescription: '욕을 했을 때!'
//     })).toHaveProperty('rowCount', 1);
//     expect(await reportModel.createReportType({
//         reportTypeName: '무단전재',
//         reportTypeDescription: '다른데로 퍼갔을 때!'
//     })).toHaveProperty('rowCount', 1);
//     expect(await reportModel.createReportType({
//         reportTypeName: '광고',
//         reportTypeDescription: '광고글을 올렸을 때!'
//     })).toHaveProperty('rowCount', 1);
//     done();
// })

test('create, update, delete report type', async (done) => {
    const type = await reportModel.createReportType({
        reportTypeName: '음란물',
        reportTypeDescription: '음란물을 올렸을때'
    });
    expect(type).toHaveProperty('rowCount', 1);

    expect(await reportModel.updateReportType({
        reportTypeId: type.rows[0].reportTypeId,
        reportTypeDescription: '음란물을 올리지 않았을때'
    })).toEqual(1);

    const after = await reportModel.getReportType(type.rows[0].reportTypeId);
    expect(after).toHaveLength(1);
    expect(after[0].reportTypeDescription).toEqual('음란물을 올리지 않았을때');
    expect(await reportModel.deleteReportType(type.rows[0].reportTypeId)).toEqual(1);
    done();
})

test('get report type', async (done) => {
    const types = await reportModel.getReportType();
    expect(types).toHaveLength(3);
    expect(await reportModel.getReportType(types[0].reportTypeId)).toHaveLength(1);
    done();
})

test('document and comment report test', async (done) => {
    const user = await userModel.getUser('orange');
    const document = (await documentModel.createDocument({
        boardId: 'seoul',
        userId: 'blue',
        isAnonymous: false,
        title: '기분좋은 개발놀이!',
        contents: '쿄ㅋ쿄쿄',
        allowAnonymous: false
    }));
    expect(document).toHaveProperty('rowCount', 1);

    const types = await reportModel.getReportType();
    expect(types.length).toBeGreaterThan(2);

    expect(await reportModel.createDocumentReport('orange', document.rows[0].documentId, types[0].reportTypeId)).toEqual(1);
    expect(await reportModel.createDocumentReport('orange', document.rows[0].documentId, types[1].reportTypeId)).toHaveProperty('code', constants.dbErrorCode.PKDUPLICATION);
    const document2 = (await documentModel.getDocument(document.rows[0].documentId))[0];
    expect(document2.reportCount).toBeGreaterThan(0);

    expect(await reportModel.getDocumentReports(document.rows[0].documentId)).toHaveLength(1);
    expect((await reportModel.getDocumentReports()).length).toBeGreaterThan(0);
    expect(await reportModel.getDocumentReports(null, 'NORMAL')).toHaveLength(1);
    expect(await reportModel.updateDocumentReport({
        documentId: document.rows[0].documentId,
        userId: 'orange',
        status: 'DELETED'
    })).toEqual(1);
    expect((await reportModel.getDocumentReports(null, 'DELETED')).length).toBeGreaterThan(0);
    expect((await reportModel.getDocumentReportsByNickName(user[0].loungeNickName, 'L')).length).toBeGreaterThan(0);

    const comment = (await commentModel.createComment({
        documentId: document.rows[0].documentId,
        userId: 'orange',
        isAnonymous: false,
        contents: '이것은 댓글이랍니다.'
    }));
    expect(comment).toHaveProperty('rowCount', 1);
    expect(await reportModel.createCommentReport('orange', comment.rows[0].commentId, types[0].reportTypeId)).toEqual(1);
    expect(await reportModel.createCommentReport('orange', comment.rows[0].commentId, types[1].reportTypeId)).toHaveProperty('code', constants.dbErrorCode.PKDUPLICATION);
    const comment2 = (await commentModel.getComment(comment.rows[0].commentId))[0];
    expect(comment2.reportCount).toBeGreaterThan(0);

    expect(await reportModel.getCommentReports(comment.rows[0].commentId)).toHaveLength(1);
    expect((await reportModel.getCommentReports()).length).toBeGreaterThan(0);
    expect(await reportModel.getCommentReports(null, 'NORMAL')).toHaveLength(1);
    expect(await reportModel.updateCommentReport({
        commentId: comment.rows[0].commentId,
        userId: 'orange',
        status: 'DELETED'
    })).toEqual(1);
    expect((await reportModel.getCommentReports(null, 'DELETED')).length).toBeGreaterThan(0);
    expect(await reportModel.getCommentReportsByNickName(user[0].loungeNickName, 'L')).toHaveLength(1);

    expect(await documentModel.deleteDocument(document.rows[0].documentId)).toEqual(1);
    expect(await commentModel.deleteComment(comment.rows[0].commentId)).toEqual(1);
    done();
});
/* global expect */
const commentModel = require('../../server/models/commentModel'),
    documentModel = require('../../server/models/documentModel');


//test('create comment - init', async(done) => {
//expect(await commentModel.createAnimalNames(['강아지', '멍멍이'])).toEqual(2);
//expect(await commentModel.createAnimalNames('고양이')).toEqual(1);
// const document = (await documentModel.getDocuments('nofree'))[0];
// let commentId;
// const comment = await commentModel.createComment({
//     documentId: document.documentId,
//     userId: 'orange',
//     isAnonymous: false,
//     contents: '빵빵빵 터지는 댓글'
// });
// commentId = comment.rows[0].commentId
// expect(comment).toHaveProperty('rowCount', 1);
// expect(await commentModel.createComment({
//     documentId: document.documentId,
//     userId: 'blue',
//     isAnonymous: true,
//     contents: '빵빵 댓글2'
// })).toHaveProperty('rowCount', 1);
// expect(await commentModel.createComment({
//     documentId: document.documentId,
//     userId: 'orange',
//     isAnonymous: true,
//     contents: '빵빵 댓글3'
// })).toHaveProperty('rowCount', 1);
// expect(await commentModel.createComment({
//     documentId: document.documentId,
//     parentCommentId: commentId,
//     userId: 'blue',
//     isAnonymous: false,
//     contents: '빵빵 대댓글4'
// })).toHaveProperty('rowCount', 1);
// expect(await commentModel.createComment({
//     documentId: document.documentId,
//     parentCommentId: commentId,
//     userId: 'orange',
//     isAnonymous: true,
//     contents: '빵빵 대댓글5'
// })).toHaveProperty('rowCount', 1);
//done();
//});


test('get comments', async(done) => {
    const document = (await documentModel.getDocuments('nofree'))[0];
    let comment = await commentModel.getComments(document.documentId);

    expect(comment).toHaveLength(3);
    expect(await commentModel.getComments(null)).toEqual([]); //documentId is required
    expect(await commentModel.getComments(document.documentId, 2)).toEqual([]);
    done();
});

test('create comment', async(done) => {
    const document = (await documentModel.getDocuments('nofree'))[0];
    expect(await commentModel.createComment({
        documentId: document.documentId,
        userId: 'orange',
        isAnonymous: false,
        contents: '새롭게 추가한 빵빵 댓글!!'
    })).toHaveProperty('rowCount', 1);
    done();
});

test('create child comment', async(done) => {
    const document = (await documentModel.getDocuments('nofree'))[0];
    const commentId = (await commentModel.getComments(document.documentId))[0].commentId;

    expect(await commentModel.createComment({
        documentId: document.documentId,
        userId: 'blue',
        isAnonymous: false,
        contents: '새롭게 추가한 빵빵 대댓글!!',
        parentCommentId: commentId
    })).toHaveProperty('rowCount', 1);
    done();
});

test('get comment', async(done) => {
    const documents = (await documentModel.getDocuments('nofree'))[0];
    const document = (await documentModel.getDocument(documents.documentId))[0];
    const comment = await commentModel.getComments(document.documentId);
    expect(comment.length).toBeGreaterThan(2);
    expect((await commentModel.getComment(comment[0].commentId))[0].commentId).toEqual(comment[0].commentId);
    let i = 0;
    for (; i < comment.length; i++) {
        if (comment[i].userId === document.userId) {
            expect(comment[i].animalName).toEqual('글쓴이');
        } else {
            expect(comment[i].animalName).not.toEqual('글쓴이');
        }
    }
    done();
});

test('get child comment', async(done) => {
    const document = (await documentModel.getDocuments('nofree'))[0];
    const commentId = (await commentModel.getComments(document.documentId))[0].commentId;

    const comments = await commentModel.getChildComments(commentId, document.documentId);
    expect(await commentModel.getChildComments(commentId)).toEqual(comments); //no documentId case is acceptable
    expect(comments.length).toBeGreaterThan(1);
    done();
});

test('update comment', async(done) => {
    const document = (await documentModel.getDocuments('nofree'))[0];
    let comment = await commentModel.getComments(document.documentId);
    comment = comment[comment.length - 1]; //가장 마지막에 추가한 녀석 선택

    let target = {...comment };
    target.contents = '바뀐 내용입니다.';
    target.restrictionStatus = 'REQUEST';
    target.isDeleted = true;
    expect(await commentModel.updateComment(target)).toEqual(1);
    let comment2 = (await commentModel.getComment(target.commentId))[0];
    expect(comment2.contents).toEqual('삭제된 댓글입니다.');
    expect(comment2.restrictionStatus).toEqual(target.restrictionStatus);

    target.contents = comment.contents;
    target.isDeleted = false;
    target.restrictionStatus = comment.restrictionStatus;
    expect(await commentModel.updateComment(target)).toEqual(1); //restore original statue
    done();
});

test('delete comment', async(done) => {
    const document = (await documentModel.getDocuments('nofree'))[0];
    const commentId = (await commentModel.getComments(document.documentId))[0].commentId;

    let comment = await commentModel.getComments(document.documentId);
    comment = comment[comment.length - 1]; //가장 마지막에 추가한 녀석 선택
    expect(await commentModel.deleteComment(comment.commentId)).toEqual(1);
    comment = await commentModel.getChildComments(commentId, document.documentId);
    comment = comment[comment.length - 1]; //가장 마지막에 추가한 녀석 선택
    expect(await commentModel.deleteComment(comment.commentId)).toEqual(1);
    done();
});

test('get user comment', async(done) => {
    expect(await commentModel.getUserComment('blue', 2)).toHaveLength(0);
    expect((await commentModel.getUserComment('blue')).length).toBeGreaterThan(0);
    done();
})

test('create and delete animal name', async(done) => {
    expect(await commentModel.createAnimalNames(['교교교', '기기기'])).toEqual(2);
    expect(await commentModel.deleteAnimalNames(['교교교', '기기기'])).toEqual(2);
    done();
});
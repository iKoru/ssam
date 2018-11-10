/* global expect */
const voteModel = require('../server/models/voteModel'),
    documentModel = require('../server/models/documentModel'),
    commentModel = require('../server/models/commentModel');
const util = require('../server/util'),
    constants = require('../server/constants');

test('document and comment vote test', async() => {
    const document = (await documentModel.createDocument({
        boardId: 'seoul',
        userId: 'blue',
        isAnonymous: false,
        title: '기분좋은 개발놀이!',
        contents: '쿄ㅋ쿄쿄',
        allowAnonymous: false
    }));
    expect(document).toHaveProperty('rowCount', 1);
    expect(await voteModel.createDocumentVote('orange', document.rows[0].documentId, true)).toEqual(1);
    expect(await voteModel.createDocumentVote('orange', document.rows[0].documentId, false)).toHaveProperty('code', constants.dbErrorCode.PKDUPLICATION);
    const document2 = (await documentModel.getDocument(document.rows[0].documentId))[0];
    expect(document2.voteUpCount).toBeGreaterThan(0);

    const comment = (await commentModel.createComment({
        documentId: document.rows[0].documentId,
        userId: 'orange',
        isAnonymous: false,
        contents: '이것은 댓글이랍니다.'
    }));
    expect(comment).toHaveProperty('rowCount', 1);
    expect(await voteModel.createCommentVote('orange', comment.rows[0].commentId, true)).toEqual(1);
    expect(await voteModel.createCommentVote('orange', comment.rows[0].commentId, false)).toHaveProperty('code', constants.dbErrorCode.PKDUPLICATION);
    const comment2 = (await commentModel.getComment(comment.rows[0].commentId))[0];
    expect(comment2.voteUpCount).toBeGreaterThan(0);
    expect(await documentModel.deleteDocument(document.rows[0].documentId)).toEqual(1);
    expect(await commentModel.getComment(comment.rows[0].commentId)).toHaveLength(0);
});
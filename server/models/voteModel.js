const pool = require('./db').instance,
    builder = require('./db').builder;
const documentModel = require('./documentModel'),
    commentModel = require('./commentModel'),
    util = require('../util');

exports.createDocumentVote = async(userId, documentId, isUp) => {
    let result = await documentModel.updateDocumentVote(documentId, isUp);
    if (result > 0) {
        result = await pool.executeQuery('createDocumentVote',
            builder.insert()
            .into('SS_HST_DOCUMENT_VOTE')
            .setFields({
                'DOCUMENT_ID': documentId,
                'USER_ID': userId,
                'VOTE_TYPE': isUp ? 1 : -1,
                'VOTE_DATETIME': util.getYYYYMMDDHH24MISS()
            })
            .toParam()
        )
        if (!util.isNumeric(result) || (result === 0)) { //rollback when error
            await documentModel.updateDocumentVote(documentId, isUp, true);
        }
    }
    if (result > 0) {
        const document = (await documentModel.getDocument(documentId))[0];
        if (isUp && document.voteUpCount - document.voteDownCount === 15) {
            await documentModel.updateDocument({ documentId: documentId, bestDateTime: util.getYYYYMMDDHH24MISS() });
        } else if (!isUp && (document.voteUpCount - document.voteDownCount) === 14) {
            await documentModel.updateDocument({ documentId: documentId, bestDateTime: null });
        }
    }
    return result;
}

exports.createCommentVote = async(userId, commentId, isUp) => {
    let result = await commentModel.updateCommentVote(commentId, isUp);
    if (result > 0) {
        result = await pool.executeQuery('createCommentVote',
            builder.insert()
            .into('SS_HST_COMMENT_VOTE')
            .setFields({
                'COMMENT_ID': commentId,
                'USER_ID': userId,
                'VOTE_TYPE': isUp ? 1 : -1,
                'VOTE_DATETIME': util.getYYYYMMDDHH24MISS()
            })
            .toParam()
        )
        if (!util.isNumeric(result) || (result === 0)) { //rollback when error
            await commentModel.updateCommentVote(commentId, isUp, true);
        }
    }
    return result;
}
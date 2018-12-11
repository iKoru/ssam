const pool = require('./db').instance,
    builder = require('./db').builder;
const documentModel = require('./documentModel'),
    commentModel = require('./commentModel'),
    util = require('../util');

exports.createDocumentVote = async(userId, documentId, isUp) => {
    let result = await pool.executeQuery('createDocumentVote',
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
    if (result > 0) {
        result = await documentModel.updateDocumentVote(documentId, isUp);
        if (result.rowCount > 0 && result.rows[0].voteUpCount > 0) {
            if (isUp && result.rows[0].voteUpCount === 15) {
                await documentModel.updateDocument({ documentId: documentId, bestDateTime: util.getYYYYMMDDHH24MISS() });
            } else if (!isUp && result.rows[0].voteUpCount === 14) {
                await documentModel.updateDocument({ documentId: documentId, bestDateTime: null });
            }
        } else if (result.rowCount === 0 || result.code) {
            await pool.executeQuery('createDocumentVoteCancel',
                builder.delete()
                .from('SS_HST_DOCUMENT_VOTE')
                .where('DOCUMENT_ID = ?', documentId)
                .where('USER_ID = ?', userId)
                .toParam()
            )
        }
    }
    return result;
}

exports.createCommentVote = async(userId, commentId, isUp) => {
    let result = await pool.executeQuery('createCommentVote',
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
    if (result > 0) {
        result = await commentModel.updateCommentVote(commentId, isUp);
        if (!(result.rowCount > 0 && result.rows[0].voteUpCount > 0)) {
            await pool.executeQuery('createCommentVoteCancel',
                builder.delete()
                .from('SS_HST_COMMENT_VOTE')
                .where('COMMENT_ID = ?', commentId)
                .where('USER_ID = ?', userId)
                .toParam()
            )
        }
    }
    return result;
}
const pool = require('./db').instance,
    builder = require('./db').builder;
const documentModel = require('./documentModel'),
    userModel = require('./userModel'),
    boardModel = require('./boardModel'),
    util = require('../util');

const getChildComments = async(parentCommentId, documentId) => {
    return await pool.executeQuery('getChildComments' + (documentId ? 'docu' : ''),
        builder.select()
        .fields({
            'COMMENT_ID': '"commentId"',
            'DOCUMENT_ID': '"documentId"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'RESTRICTION_STATUS': '"restrictionStatus"',
            'CHILD_COUNT': '"childCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .field(builder.case().when('IS_DELETED = true').then('삭제된 댓글입니다.').else(builder.rstr('CONTENTS')), '"contents"')
        .from('SS_MST_COMMENT')
        .where('DOCUMENT_ID = ?', documentId || builder.rstr('DOCUMENT_ID'))
        .where('PARENT_COMMENT_ID = ?', parentCommentId)
        .order('COMMENT_ID')
        .toParam()
    );
}

exports.getChildComments = getChildComments;

exports.getComments = async(documentId, page = 1) => {
    if (!documentId) {
        return [];
    }
    return await pool.executeQuery('getComments',
        builder.select()
        .fields({
            'COMMENT_ID': '"commentId"',
            'DOCUMENT_ID': '"documentId"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'REPORT_COUNT': '"reportCount"',
            'RESTRICTION_STATUS': '"restrictionStatus"',
            'CHILD_COUNT': '"childCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .field(builder.case().when('IS_DELETED = true').then('삭제된 댓글입니다.').else(builder.rstr('CONTENTS')), '"contents"')
        .from('SS_MST_COMMENT')
        .where('DOCUMENT_ID = ?', documentId)
        .where('DEPTH = 0')
        .order('COMMENT_ID')
        .limit(100)
        .offset((page - 1) * 100)
        .toParam()
    )
}

const updateComment = async(comment) => {
    if (!comment.commentId) {
        return 0;
    }
    let query = builder.update().table('SS_MST_COMMENT');
    if (comment.contents !== undefined) {
        query.set('CONTENTS', comment.contents)
    }
    if (comment.child !== undefined) {
        query.set('CHILD_COUNT', builder.str('CHILD_COUNT + 1'))
    }
    if (comment.restrictionStatus !== undefined) {
        query.set('RESTRICTION_STATUS', comment.restrictionStatus)
    }
    if (comment.isDeleted !== undefined) {
        query.set('IS_DELETED', comment.isDeleted)
    }
    if (comment.reserved1 !== undefined) {
        query.set('RESERVED1', comment.reserved1)
    }
    if (comment.reserved2 !== undefined) {
        query.set('RESERVED2', comment.reserved2)
    }
    if (comment.reserved3 !== undefined) {
        query.set('RESERVED3', comment.reserved3)
    }
    if (comment.reserved4 !== undefined) {
        query.set('RESERVED4', comment.reserved4)
    }
    return await pool.executeQuery('updateComment' + (comment.contents ? 'contents' : '') + (comment.child ? 'child' : '') + (comment.restrictionStatus ? 'rest' : '') + (comment.isDeleted !== undefined ? 'delete' : '') + (comment.reserved1 ? '1' : '') + (comment.reserved2 ? '2' : '') + (comment.reserved3 ? '3' : '') + (comment.reserved4 ? '4' : ''),
        query.where('COMMENT_ID = ?', comment.commentId)
        .toParam()
    )
}

exports.updateComment = updateComment;

const deleteChildComment = async(parentCommentId, documentId) => {
    return await pool.executeQuery('deleteChildComment',
        builder.delete()
        .from('SS_MST_COMMENT')
        .where('DOCUMENT_ID = ?', documentId)
        .where('PARENT_COMMENT_ID = ?', parentCommentId)
        .toParam()
    )
}

exports.deleteComment = async(commentId) => {
    const comment = (await getComment(commentId))[0];
    if (!comment) {
        return 0;
    }
    const result = await pool.executeQuery('deleteComment',
        builder.delete()
        .from('SS_MST_COMMENT')
        .where('COMMENT_ID = ?', commentId)
        .toParam()
    );
    if (result > 0 && comment.childCount > 0) {
        await deleteChildComment(commentId, comment.documentId);
    }
    return result;
}

exports.createComment = async(comment) => {
    const document = await documentModel.getDocument(comment.documentId);
    if (!document || !document[0]) {
        return 0;
    }
    if (!comment.isAnonymous) {
        const board = await boardModel.getBoard(document[0].boardId);
        const user = await userModel.getUser(comment.userId);
        comment.userNickName = board[0].boardType === 'T' ? user[0].topicNickName : user[0].loungeNickName;
    }
    const result = await pool.executeQuery('createComment',
        builder.insert()
        .into('SS_MST_COMMENT')
        .setFields({
            'COMMENT_ID': builder.rstr('nextval(\'SEQ_SS_MST_COMMENT\')'),
            'DOCUMENT_ID': comment.documentId,
            'USER_ID': comment.userId,
            'CONTENTS': comment.contents,
            'USER_NICKNAME': comment.userNickName,
            'PARENT_COMMENT_ID': comment.parentCommentId,
            'DEPTH': comment.parentCommentId ? 1 : 0,
            'WRITE_DATETIME': util.getYYYYMMDDHH24MISS(),
            'IS_ANONYMOUS': document[0].allowAnonymous ? comment.isAnonymous : false,
            'RESERVED1': comment.reserved1,
            'RESERVED2': comment.reserved2,
            'RESERVED3': comment.reserved3,
            'RESERVED4': comment.reserved4
        })
        .returning('COMMENT_ID', '"commentId"')
        .toParam()
    )
    if (result.rowCount > 0 && comment.parentCommentId) {
        await updateComment({
            commentId: comment.parentCommentId,
            child: true
        });
    }
    if (result.rowCount > 0) {
        await documentModel.updateDocumentCommentCount(document[0].documentId);
    }
    return result;
}

const getComment = async(commentId) => {
    return await pool.executeQuery('getComment',
        builder.select()
        .fields({
            'COMMENT_ID': '"commentId"',
            'DOCUMENT_ID': '"documentId"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'REPORT_COUNT': '"reportCount"',
            'RESTRICTION_STATUS': '"restrictionStatus"',
            'CHILD_COUNT': '"childCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .field(builder.case().when('IS_DELETED = true').then('삭제된 댓글입니다.').else(builder.rstr('CONTENTS')), '"contents"')
        .from('SS_MST_COMMENT')
        .where('COMMENT_ID = ?', commentId)
        .toParam()
    )
}

exports.getComment = getComment;

exports.getUserComment = async(userId, page = 1) => {
    return await pool.executeQuery('getUserComment',
        builder.select()
        .fields({
            'COMMENT_ID': '"commentId"',
            'DOCUMENT_ID': '"documentId"',
            'CONTENTS': '"contents"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'REPORT_COUNT': '"reportCount"',
            'RESTRICTION_STATUS': '"restrictionStatus"',
            'CHILD_COUNT': '"childCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .from('SS_MST_COMMENT')
        .where('USER_ID = ?', userId)
        .where('IS_DELETED = false')
        .order('COMMENT_ID', false)
        .limit(10)
        .offset((page - 1) * 10)
        .toParam()
    )
}

exports.updateCommentVote = async(commentId, isUp, isCancel) => {
    return await pool.executeQuery('updateCommentVote' + (isUp ? 'up' : 'down'),
        builder.update()
        .table('SS_MST_COMMENT')
        .set(isUp ? 'VOTE_UP_COUNT' : 'VOTE_DOWN_COUNT', builder.str(isUp ? `VOTE_UP_COUNT ${isCancel?'-':'+'} 1` : `VOTE_DOWN_COUNT ${isCancel?'-':'+'} 1`))
        .where('COMMENT_ID = ?', commentId)
        .toParam()
    )
}

exports.updateCommentReport = async(commentId) => {
    return await pool.executeQuery('updateCommentReport',
        builder.update()
        .table('SS_MST_COMMENT')
        .set('REPORT_COUNT', builder.str('REPORT_COUNT + 1'))
        .where('COMMENT_ID = ?', commentId)
        .toParam()
    )
}
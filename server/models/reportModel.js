const pool = require('./db').instance,
    builder = require('./db').builder;
const documentModel = require('./documentModel'),
    commentModel = require('./commentModel'),
    boardModel = require('./boardModel'),
    userModel = require('./userModel'),
    util = require('../util');

exports.getDocumentReports = async(documentId, status, page = 1) => {
    //if documentId is null, select all document's reports. admin access only in this case.
    let from = builder.select().fields(['DOCUMENT_ID', 'USER_NICKNAME', 'REPORT_TYPE_ID', 'REPORT_DATETIME', 'STATUS']).from('SS_HST_DOCUMENT_REPORT');
    if (documentId) {
        from.where('DOCUMENT_ID = ?', documentId)
    }
    if (status) {
        from.where('STATUS = ?', status)
    }
    return await pool.executeQuery('getDocumentReports' + (documentId ? 'doc' : '') + (status ? 'st' : ''),
        builder.select()
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'USER_NICKNAME': '"nickName"',
            'REPORT_TYPE_NAME': '"reportTypeName"',
            'REPORT_TYPE_DESCRIPTION': '"reportTypeDescription"',
            'REPORT_DATETIME': '"reportDate"',
            'STATUS': '"status"'
        })
        .from(from, 'DOCUMENT')
        .join('SS_MST_REPORT', 'REPORT', 'REPORT.REPORT_TYPE_ID = DOCUMENT.REPORT_TYPE_ID')
        .order('REPORT_DATETIME')
        .offset((page - 1) * 10)
        .limit(10)
        .toParam()
    )
}

exports.getDocumentReportsByNickName = async(nickName, boardType, page = 1) => {
    const user = await userModel.getUserIdByNickName(nickName, boardType);
    if (!user || !user[0]) {
        return [];
    }
    return await pool.executeQuery('getDocumentReportsByNickName',
        builder.select()
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'USER_NICKNAME': '"nickName"',
            'REPORT_TYPE_NAME': '"reportTypeName"',
            'REPORT_TYPE_DESCRIPTION': '"reportTypeDescription"',
            'REPORT_DATETIME': '"reportDate"',
            'STATUS': '"status"'
        })
        .from(builder.select().fields(['USER_NICKNAME', 'DOCUMENT_ID', 'REPORT_TYPE_ID', 'REPORT_DATETIME', 'STATUS']).from('SS_HST_DOCUMENT_REPORT').where('USER_ID = ?', user[0].userId), 'RUSER')
        .join('SS_MST_REPORT', 'REPORT', 'REPORT.REPORT_TYPE_ID = RUSER.REPORT_TYPE_ID')
        .order('REPORT_DATETIME', false)
        .offset((page - 1) * 10)
        .limit(10)
        .toParam()
    )
}

exports.getCommentReports = async(commentId, status, page = 1) => {
    //if commentId is null, select all comment's reports. admin access only in this case.
    let from = builder.select().fields(['COMMENT_ID', 'USER_NICKNAME', 'REPORT_TYPE_ID', 'REPORT_DATETIME', 'STATUS']).from('SS_HST_COMMENT_REPORT');
    if (commentId) {
        from.where('COMMENT_ID = ?', commentId)
    }
    if (status) {
        from.where('STATUS = ?', status)
    }
    return await pool.executeQuery('getCommentReports' + (commentId ? 'doc' : '') + (status ? 'st' : ''),
        builder.select()
        .fields({
            'COMMENT_ID': '"commentId"',
            'USER_NICKNAME': '"nickName"',
            'REPORT_TYPE_NAME': '"reportTypeName"',
            'REPORT_TYPE_DESCRIPTION': '"reportTypeDescription"',
            'REPORT_DATETIME': '"reportDateTime"',
            'STATUS': '"status"'
        })
        .from(from, 'COMMENT')
        .join('SS_MST_REPORT', 'REPORT', 'REPORT.REPORT_TYPE_ID = COMMENT.REPORT_TYPE_ID')
        .order('REPORT_DATETIME')
        .offset((page - 1) * 10)
        .limit(10)
        .toParam()
    )
}

exports.getCommentReportsByNickName = async(nickName, boardType, page = 1) => {
    const user = await userModel.getUserIdByNickName(nickName, boardType);
    if (!user || !user[0]) {
        return [];
    }
    return await pool.executeQuery('getCommentReportsByNickName',
        builder.select()
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'RUSER.COMMENT_ID': '"commentId"',
            'RUSER.USER_NICKNAME': '"nickName"',
            'REPORT_TYPE_NAME': '"reportTypeName"',
            'REPORT_TYPE_DESCRIPTION': '"reportTypeDescription"',
            'REPORT_DATETIME': '"reportDateTime"',
            'RUSER.STATUS': '"status"'
        })
        .from(builder.select().fields(['USER_NICKNAME', 'COMMENT_ID', 'REPORT_TYPE_ID', 'REPORT_DATETIME', 'STATUS']).from('SS_HST_COMMENT_REPORT').where('USER_ID = ?', user[0].userId), 'RUSER')
        .join('SS_MST_REPORT', 'REPORT', 'REPORT.REPORT_TYPE_ID = RUSER.REPORT_TYPE_ID')
        .join('SS_MST_COMMENT', 'COMMENT', 'RUSER.COMMENT_ID = COMMENT.COMMENT_ID')
        .order('REPORT_DATETIME', false)
        .offset((page - 1) * 10)
        .limit(10)
        .toParam()
    )
}

exports.createDocumentReport = async(userId, documentId, reportType) => {
    const user = await userModel.getUser(userId);
    if (!user || !user[0]) {
        return 0;
    }
    let result = await documentModel.updateDocumentReport(documentId);
    if (result > 0) {
        const board = await boardModel.getBoardByDocument(documentId);
        result = await pool.executeQuery('createDocumentReport',
            builder.insert()
            .into('SS_HST_DOCUMENT_REPORT')
            .setFields({
                'DOCUMENT_ID': documentId,
                'USER_ID': userId,
                'USER_NICKNAME': board[0].boardType === 'T' ? user[0].topicNickName : user[0].loungeNickName,
                'REPORT_TYPE_ID': reportType,
                'REPORT_DATETIME': util.getYYYYMMDDHH24MISS()
            })
            .toParam()
        )
        if (!util.isNumeric(result) || (result === 0)) { //rollback when error
            await documentModel.updateDocumentReport(documentId, true);
        }
    }
    return result;
}

exports.createCommentReport = async(userId, commentId, reportType) => {
    const user = await userModel.getUser(userId);
    if (!user || !user[0]) {
        return 0;
    }
    let result = await commentModel.updateCommentReport(commentId);
    if (result > 0) {
        const comment = await commentModel.getComment(commentId);
        const board = await boardModel.getBoardByDocument(comment[0].documentId);
        result = await pool.executeQuery('createCommentReport',
            builder.insert()
            .into('SS_HST_COMMENT_REPORT')
            .setFields({
                'COMMENT_ID': commentId,
                'USER_ID': userId,
                'USER_NICKNAME': board[0].boardType === 'T' ? user[0].topicNickName : user[0].loungeNickName,
                'REPORT_TYPE_ID': reportType,
                'REPORT_DATETIME': util.getYYYYMMDDHH24MISS()
            })
            .toParam()
        )
        if (!util.isNumeric(result) || (result === 0)) { //rollback when error
            await commentModel.updateCommentReport(commentId, true);
        }
    }
    return result;
}

exports.updateDocumentReport = async(report) => {
    return await pool.executeQuery('updateDocumentReportStatus',
        builder.update()
        .table('SS_HST_DOCUMENT_REPORT')
        .set('STATUS', report.status)
        .where('DOCUMENT_ID = ?', report.documentId)
        .where('USER_ID = ?', report.userId)
        .toParam()
    )
}

exports.updateCommentReport = async(report) => {
    return await pool.executeQuery('updateCommentReportStatus',
        builder.update()
        .table('SS_HST_COMMENT_REPORT')
        .set('STATUS', report.status)
        .where('COMMENT_ID = ?', report.commentId)
        .where('USER_ID = ?', report.userId)
        .toParam()
    )
}

exports.createReportType = async(reportType) => {
    return await pool.executeQuery('createReportType',
        builder.insert()
        .into('SS_MST_REPORT')
        .setFields({
            'REPORT_TYPE_ID': builder.str('SELECT COALESCE(MAX(REPORT_TYPE_ID), 0) + 1 FROM SS_MST_REPORT'),
            'REPORT_TYPE_NAME': reportType.reportTypeName,
            'REPORT_TYPE_DESCRIPTION': reportType.reportTypeDescription
        })
        .returning('REPORT_TYPE_ID', '"reportTypeId"')
        .toParam()
    )
}

exports.updateReportType = async(reportType) => {
    let query = builder.update()
        .table('SS_MST_REPORT');
    if (reportType.reportTypeName !== undefined) {
        query.set('REPORT_TYPE_NAME', reportType.reportTypeName)
    }
    if (reportType.reportTypeDescription !== undefined) {
        query.set('REPORT_TYPE_DESCRIPTION', reportType.reportTypeDescription)
    }
    return await pool.executeQuery('updateReportType',
        query.where('REPORT_TYPE_ID = ?', reportType.reportTypeId)
        .toParam()
    )
}

exports.getReportType = async(reportTypeId) => {
    let query = builder.select()
        .fields({
            'REPORT_TYPE_ID': '"reportTypeId"',
            'REPORT_TYPE_NAME': '"reportTypeName"',
            'REPORT_TYPE_DESCRIPTION': '"reportTypeDescription"'
        })
        .from('SS_MST_REPORT')
    if (reportTypeId) {
        query.where('REPORT_TYPE_ID = ?', reportTypeId)
    }
    return await pool.executeQuery('getReportType' + (reportTypeId ? 'Id' : ''),
        query.order('REPORT_TYPE_ID')
        .toParam()
    )
}

exports.deleteReportType = async(reportTypeId) => {
    return await pool.executeQuery('deleteReportType',
        builder.delete()
        .from('SS_MST_REPORT')
        .where('REPORT_TYPE_ID = ?', reportTypeId)
        .toParam()
    )
}
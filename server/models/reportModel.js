const pool = require('./db').instance,
    builder = require('./db').builder;
const documentModel = require('./documentModel'),
    commentModel = require('./commentModel'),
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

exports.getDocumentReportsAdmin = async(documentId, userId, status, page = 1) => {
    let from = builder.select().fields(['USER_NICKNAME', 'DOCUMENT_ID', 'REPORT_TYPE_ID', 'REPORT_DATETIME', 'STATUS']).from('SS_HST_DOCUMENT_REPORT')
    if(userId){
        from.where('USER_ID = ?', userId);
    }
    if(status){
        from.where('STATUS = ?', status)
    }
    let document;
    if(documentId){
        document = builder.select().from('SS_MST_DOCUMENT').where('DOCUMENT_ID = ?', documentId)
    }else{
        document = 'SS_MST_DOCUMENT';
    }
    
    let query = builder.select()
        .fields({
            'RUSER.DOCUMENT_ID': '"documentId"',
            'DOCUMENT.TITLE':'"title"',
            'DOCUMENT.BOARD_ID':'"boardId"',
            'RUSER.USER_NICKNAME': '"nickName"',
            'REPORT_TYPE_NAME': '"reportTypeName"',
            'REPORT_TYPE_DESCRIPTION': '"reportTypeDescription"',
            'REPORT_DATETIME': '"reportDateTime"',
            'RUSER.STATUS': '"status"'
        })
        .from(from, 'RUSER')
        .join('SS_MST_REPORT', 'REPORT', 'REPORT.REPORT_TYPE_ID = RUSER.REPORT_TYPE_ID')
        .join(document, 'DOCUMENT', 'RUSER.DOCUMENT_ID = DOCUMENT.DOCUMENT_ID')
    return await pool.executeQuery('getDocumentReportsAdmin',
        query.order('REPORT_DATETIME', false)
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

exports.getCommentReportsAdmin = async(commentId, userId, status, page = 1) => {
    let from = builder.select().fields(['USER_NICKNAME', 'COMMENT_ID', 'REPORT_TYPE_ID', 'REPORT_DATETIME', 'STATUS']).from('SS_HST_COMMENT_REPORT')
    if(userId){
        from.where('USER_ID = ?', userId);
    }
    if(status){
        from.where('STATUS = ?', status)
    }
    let comment;
    if(commentId){
        comment = builder.select().from('SS_MST_COMMENT').where('COMMENT_ID = ?', commentId)
    }else{
        comment = 'SS_MST_COMMENT';
    }
    
    let query = builder.select()
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'RUSER.COMMENT_ID': '"commentId"',
            'RUSER.USER_NICKNAME': '"nickName"',
            'REPORT_TYPE_NAME': '"reportTypeName"',
            'REPORT_TYPE_DESCRIPTION': '"reportTypeDescription"',
            'REPORT_DATETIME': '"reportDateTime"',
            'RUSER.STATUS': '"status"'
        })
        .from(from, 'RUSER')
        .join('SS_MST_REPORT', 'REPORT', 'REPORT.REPORT_TYPE_ID = RUSER.REPORT_TYPE_ID')
        .join(comment, 'COMMENT', 'RUSER.COMMENT_ID = COMMENT.COMMENT_ID')
    return await pool.executeQuery('getCommentReportsAdmin',
        query.order('REPORT_DATETIME', false)
        .offset((page - 1) * 10)
        .limit(10)
        .toParam()
    )
}

exports.createDocumentReport = async(userId, documentId, reportTypeId, userNickName) => {
    let result = await pool.executeQuery('createDocumentReport',
        builder.insert()
        .into('SS_HST_DOCUMENT_REPORT')
        .setFields({
            'DOCUMENT_ID': documentId,
            'USER_ID': userId,
            'USER_NICKNAME': userNickName,
            'REPORT_TYPE_ID': reportTypeId,
            'REPORT_DATETIME': util.getYYYYMMDDHH24MISS()
        })
        .toParam()
    )
    if (result > 0) {
        result = await documentModel.updateDocumentReport(documentId);
        if (typeof result === 'object' || result === 0) { //rollback when error
            deleteDocumentReport(userId, documentId);
        }
    }
    return result;
}

const deleteDocumentReport = async(userId, documentId) => {
    return pool.executeQuery('deleteDocumentReport',
        builder.delete()
        .from('SS_HST_DOCUMENT_REPORT')
        .where('USER_ID = ?', userId)
        .where('DOCUMENT_ID = ?', documentId)
        .toParam()
        )
}

const deleteCommentReport = async(userId, commentId) => {
    return pool.executeQuery('deleteComumentReport',
        builder.delete()
        .from('SS_HST_COMMENT_REPORT')
        .where('USER_ID = ?', userId)
        .where('COMMENT_ID = ?', commentId)
        .toParam()
        )
}
exports.createCommentReport = async(userId, commentId, reportTypeId, userNickName) => {
    let result = await pool.executeQuery('createCommentReport',
            builder.insert()
            .into('SS_HST_COMMENT_REPORT')
            .setFields({
                'COMMENT_ID': commentId,
                'USER_ID': userId,
                'USER_NICKNAME': userNickName,
                'REPORT_TYPE_ID': reportTypeId,
                'REPORT_DATETIME': util.getYYYYMMDDHH24MISS()
            })
            .toParam()
        )
    if (result > 0) {
        result = await commentModel.updateCommentReport(commentId);
        if(typeof result === 'object' || result === 0){
            deleteCommentReport(userId, commentId)
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
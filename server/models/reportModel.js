const pool = require('./db').instance;

exports.getDocumentReports = async(documentId, nickName, status, page = 1) => {
    //if documentId is null, select all document's reports. admin access only in this case.
}

exports.getCommentReports = async(commentId, nickName, status, page = 1) => {
    //if commentId is null, select all comment's reports. admin access only in this case.
}

exports.createDocumentReport = async(userId, documentId, reportType) => {

}

exports.createCommentreport = async(userId, commentId, reportType) => {

}

exports.updateDocumentReport = async(report) => {

}

exports.updateCommentReport = async(report) => {

}
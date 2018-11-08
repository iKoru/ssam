const pool = require('./db').instance,
    builder = require('./db').builder;

const getSubComments = async(parentCommentId) => {
    return await pool.executeQuery('getSubComments',
        builder.select()
        .fields({

        })
        .from('SS_MST_COMMENTS')
        .where('PARENT_COMMENT_ID = ?', parentCommentId)
        .toParam()
    );
}

exports.getSubComments = getSubComments;

exports.getComments = async(documentId, page = 1, searchTarget = "title", sortTarget = "writeDateTime", sortType = "desc") => {
    //commentId: comment list -> around it
}

exports.updateComment = async(comment) => {

}

exports.deleteComment = async(comment) => {

}

exports.createComment = async(comment) => {

}

exports.getComment = async(commentId) => {

}

exports.getUserComment = async(userId, page = 1) => {

}
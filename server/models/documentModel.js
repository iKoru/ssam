const pool = require('./db').instance,
    builder = require('./db').builder;
const util = require('../util');

exports.getDocuments = async(boardId, searchQuery, documentId, page = 1, searchTarget = "title", sortTarget = "writeDateTime", sortType = "desc") => {
    //documentId: document list -> around it
    //TODO
}

exports.updateDocument = async(document) => {
    //TODO
}

exports.deleteDocument = async(documentId, userId) => {
    if (await pool.executeQuery('deleteDocument',
            builder.delete()
            .form('SS_MST_DOCUMENT')
            .where('DOCUMENT_ID = ?', documentId)
            .where('USER_ID = ?', userId)
            .toParam()
        ) == 0) {

        const user = userModel.getUser(userId);
        if (user[0].isAdmin) {
            return await pool.executeQuery('deleteDocument',
                builder.delete()
                .form('SS_MST_DOCUMENT')
                .where('DOCUMENT_ID = ?', documentId)
                .toParam()
            )
        } else {
            return 0;
        }
    }
    return 1;
}

exports.createDocument = async(document) => {
    const user = await userModel.getUser(document.userId);
    const board = await boardModel.getBoard(document.boardId);
    return await pool.executeQuery('createDocument',
        builder.insert()
        .into('SS_MST_DOCUMENT')
        .setFields({
            'DOCUMENT_ID': builder.rstr('nextval(\'SEQ_SS_MST_DOCUMENT\')'),
            'BOARD_ID': document.boardId,
            'USER_ID': document.userId,
            'USER_NICKNAME': board[0].boardType === 'T' ? user[0].topicNickName : user[0].loungeNickName,
            'IS_ANONYMOUS': board[0].isAnonymousable ? document.isAnonymous : false,
            'WRITE_DATETIME': util.getYYYYMMDDHH24MISS(),
            'TITLE': document.title,
            'CONTENTS': document.contents,
            'SURVEY_CONETNTS': document.surveyContents,
            'RESTRICTION': document.restriction,
            'RESERVED1': document.reserved1,
            'RESERVED2': document.reserved2,
            'RESERVED3': document.reserved3,
            'RESERVED4': document.reserved4
        })
        .returning('DOCUMENT_ID')
        .toParam()
    )
}

exports.getDocument = async(documentId) => {
    return await pool.executeQuery('getDocument',
        builder.select()
        .fields({
            //TODO
        })
        .from('SS_MST_DOCUMENT')
        .where('DOCUMENT_ID = ?', documentId)
        .toParam()
    );
}

exports.getUserDocument = async(userId, page = 1) => {
    return await pool.executeQuery('getUserDocument',
        builder.select()
        .fields({
            //TODO
        })
        .from('SS_MST_DOCUMENT')
        .where('USER_ID = ?', userId)
        .order('DOCUMENT_ID', false)
        .offset((page - 1) * 15)
        .limit(15)
        .toParam()
    );
}
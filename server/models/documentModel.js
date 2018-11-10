const pool = require('./db').instance,
    builder = require('./db').builder;
const util = require('../util');
const boardModel = require('./boardModel'),
    userModel = require('./userModel');

exports.getDocuments = async(boardId, documentId, searchQuery, searchTarget, sortTarget, isAscending = false, page, isAdmin = false) => {
    if (!boardId) {
        return [];
    }
    let query = builder.select()
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'BOARD_ID': '"boardId"',
            'COMMENT_COUNT': '"commentCount"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'VIEW_COUNT': '"viewCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'TITLE': '"title"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .from('SS_MST_DOCUMENT')
    if (!isAdmin) {
        query.where('IS_DELETED = false');
    }
    if (boardId && typeof boardId === 'string') {
        query.where('BOARD_ID = ?', boardId)
    } else if (boardId && typeof boardId === 'object') { //array
        query.where('BOARD_ID IN ?', boardId)
    }
    if (searchQuery) {
        switch (searchTarget) {
            case 'title':
                query.where('TITLE LIKE \'%\' || ? || \'%\'', searchQuery)
                break;
            case 'contents':
                query.where('CONTENTS LIKE \'%\' || ? || \'%\'', searchQuery)
                break;
            case 'titleContents':
                query.where('TITLE LIKE \'%\' || ? || \'%\' OR CONTENTS LIKE \'%\' || ? || \'%\'', searchQuery, searchQuery)
                break;
        }
    }
    switch (sortTarget) {
        case 'viewCount':
            query.order('VIEW_COUNT', isAscending)
            break;
        case 'voteCount':
            query.order('(VOTE_UP_COUNT - VOTE_DOWN_COUNT)', isAscending)
            break; //indexed
        case 'writeDateTime':
        default:
            query.order('WRITE_DATETIME', isAscending)
            break;
    }


    //find page
    if (documentId) {
        //around documentId
        let withQuery = builder.select().field('DOCUMENT_ID');
        switch (sortTarget) {
            case 'viewCount':
                withQuery.field(`ROW_NUMBER() OVER (ORDER BY VIEW_COUNT ${isAscending ? 'ASC' : 'DESC'})`, 'NUM')
                break;
            case 'voteCount':
                withQuery.field(`ROW_NUMBER() OVER (ORDER BY (VOTE_UP_COUNT - VOTE_DOWN_COUNT) ${isAscending ? 'ASC' : 'DESC'})`, 'NUM')
                break; //indexed
            case 'writeDateTime':
            default:
                withQuery.field(`ROW_NUMBER() OVER (ORDER BY WRITE_DATETIME ${isAscending ? 'ASC' : 'DESC'})`, 'NUM')
                break;
        }
        withQuery.from('SS_MST_DOCUMENT')
        if (!isAdmin) {
            withQuery.where('IS_DELETED = false');
        }
        if (boardId && typeof boardId === 'string') {
            withQuery.where('BOARD_ID = ?', boardId)
        } else if (boardId && typeof boardId === 'object') { //array
            withQuery.where('BOARD_ID IN ?', boardId)
        }
        if (searchQuery) {
            switch (searchTarget) {
                case 'title':
                    withQuery.where('TITLE LIKE \'%\' || ? || \'%\'', searchQuery)
                    break;
                case 'contents':
                    withQuery.where('CONTENTS LIKE \'%\' || ? || \'%\'', searchQuery)
                    break;
                case 'titleContents':
                    withQuery.where('TITLE LIKE \'%\' || ? || \'%\' OR CONTENTS LIKE \'%\' || ? || \'%\'', searchQuery, searchQuery)
                    break;
            }
        }
        const pages = await pool.executeQuery('findDocumentPage' + (isAdmin ? 'admin' : '') + (boardId ? (typeof boardId === 'object' ? boardId.length : '') + 'board' : '') + (searchQuery ? (searchTarget === 'title' ? 'title' : (searchTarget === 'contents' ? 'contents' : (searchTarget === 'titleContents' ? 'titleContents' : ''))) : '') + (isAscending ? 'asc' : 'desc'),
            builder.select().with('DOCUMENTS', withQuery).field('CEIL(NUM/10.0)', '"page"').from('DOCUMENTS').where('DOCUMENT_ID = ?', documentId)
            .toParam()
        );
        if (pages && pages.length === 1 && pages[0].page) {
            page = pages[0].page;
        } else { //document가 해당 board에 없을 경우/삭제되었을 경우 등등
            page = 1;
        }
    } else if (!util.isNumeric(page)) {
        page = 1;
    }

    //select documents
    return await pool.executeQuery('getDocuments' + (isAdmin ? 'admin' : '') + (boardId ? (typeof boardId === 'object' ? boardId.length : '') + 'board' : '') + (searchQuery ? (searchTarget === 'title' ? 'title' : (searchTarget === 'contents' ? 'contents' : (searchTarget === 'titleContents' ? 'titleContents' : ''))) : '') + (isAscending ? 'asc' : 'desc'),
        query.limit(10).offset((page - 1) * 10)
        .toParam()
    )
}

exports.getBestDocuments = async(boardId, documentId, boardType, searchQuery, searchTarget, page) => {
    let query = builder.select();
    if (boardType === 'L' && !boardId) { //lounge best
        query.with('BOARDS', builder.select().field('BOARD_ID').from('SS_MST_BOARD').where('BOARD_TYPE = \'L\''))
    }
    query.fields({
            'DOCUMENT_ID': '"documentId"',
            'DOCUMENT.BOARD_ID': '"boardId"',
            'COMMENT_COUNT': '"commentCount"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'VIEW_COUNT': '"viewCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'TITLE': '"title"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .from('SS_MST_DOCUMENT', 'DOCUMENT')
        .where('IS_DELETED = false')
        .where('BEST_DATETIME IS NOT NULL');
    if (boardType === 'L' && !boardId) { //lounge best
        query.where('DOCUMENT.BOARD_ID IN (SELECT BOARD_ID FROM BOARDS)')
    } else if (boardId) { //certain board
        query.where('BOARD_ID = ?', boardId)
    } else {
        return [];
    }
    if (searchQuery) {
        switch (searchTarget) {
            case 'title':
                query.where('TITLE LIKE \'%\' || ? || \'%\'', searchQuery)
                break;
            case 'contents':
                query.where('CONTENTS LIKE \'%\' || ? || \'%\'', searchQuery)
                break;
            case 'titleContents':
                query.where('TITLE LIKE \'%\' || ? || \'%\' OR CONTENTS LIKE \'%\' || ? || \'%\'', searchQuery)
                break;
        }
    }

    //find page
    if (documentId) {
        //around documentId
        let withQuery = builder.select();
        if (boardType === 'L' && !boardId) { //lounge best
            withQuery.with('BOARDS', builder.select().field('BOARD_ID').from('SS_MST_BOARD').where('BOARD_TYPE = \'L\''))
        }
        withQuery.field('DOCUMENT.DOCUMENT_ID')
            .field(builder.rstr('ROW_NUMBER() OVER (ORDER BY BEST_DATETIME DESC)'), 'NUM')
            .from('SS_MST_DOCUMENT', 'DOCUMENT')
            .where('IS_DELETED = false')
        if (boardType === 'L' && !boardId) { //lounge best
            withQuery.where('DOCUMENT.BOARD_ID IN (SELECT BOARD_ID FROM BOARDS)')
        } else if (boardId) { //certain board
            withQuery.where('BOARD_ID = ?', boardId)
        }
        if (searchQuery) {
            switch (searchTarget) {
                case 'title':
                    withQuery.where('TITLE LIKE \'%\' || ? || \'%\'', searchQuery)
                    break;
                case 'contents':
                    withQuery.where('CONTENTS LIKE \'%\' || ? || \'%\'', searchQuery)
                    break;
                case 'titleContents':
                    withQuery.where('TITLE LIKE \'%\' || ? || \'%\' OR CONTENTS LIKE \'%\' || ? || \'%\'', searchQuery)
                    break;
            }
        }
        const pages = await pool.executeQuery('findDocumentPage' + boardType + boardId + (searchQuery ? (searchTarget === 'title' ? 'title' : (searchTarget === 'contents' ? 'contents' : (searchTarget === 'titleContents' ? 'titleContents' : ''))) : ''),
            builder.select().with('DOCUMENTS', withQuery).field('CEIL(NUM/10.0)', '"page"').from('DOCUMENTS').where('DOCUMENT_ID = ?', documentId)
            .toParam()
        );
        if (pages && pages.length === 1 && pages[0].page) {
            page = pages[0].page;
        } else { //해당 document가 board에 없을 경우/ 삭제되었을 경우 등등
            page = 1;
        }
    } else if (!util.isNumeric(page)) {
        page = 1;
    }

    return await pool.executeQuery('getBestDocumenta' + boardType + boardId + (searchQuery ? (searchTarget === 'title' ? 'title' : (searchTarget === 'contents' ? 'contents' : (searchTarget === 'titleContents' ? 'titleContents' : ''))) : ''),
        query.order('BEST_DATETIME', false).limit(10).offset((page - 1) * 10)
        .toParam()
    )
}

exports.updateDocument = async(document) => {
    if (!document.documentId) {
        return 0;
    }
    let query = builder.update().table('SS_MST_DOCUMENT');
    if (document.title) {
        query.set('TITLE', document.title)
    }
    if (document.contents) {
        query.set('CONTENTS', document.contents)
    }
    if (document.boardId) {
        const doc = (await getDocument(document.documentId))[0];
        const isWritable = await boardModel.checkUserBoardWritable(doc.userId, document.boardId);
        if (isWritable[0].count > 0) {
            query.set('BOARD_ID', document.boardId)
        }
    }
    if (document.isDeleted !== undefined) {
        query.set('IS_DELETED', document.isDeleted)
    }
    if (document.bestDateTime) {
        query.set('BEST_DATETIME', document.bestDateTime)
    }
    if (document.restriction) {
        query.set('RESTRICTION', document.restriction)
    }
    if (document.reserved1) {
        query.set('RESERVED1', document.reserved1)
    }
    if (document.reserved2) {
        query.set('RESERVED1', document.reserved2)
    }
    if (document.reserved3) {
        query.set('RESERVED1', document.reserved3)
    }
    if (document.reserved4) {
        query.set('RESERVED1', document.reserved4)
    }
    return await pool.executeQuery(null,
        query.where('DOCUMENT_ID = ?', document.documentId)
        .toParam()
    );
}

exports.deleteDocument = async(documentId, userId) => {
    return await pool.executeQuery('deleteDocument',
        builder.delete()
        .from('SS_MST_DOCUMENT')
        .where('DOCUMENT_ID = ?', documentId)
        .toParam()
    )
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
            'SURVEY_CONTENTS': document.surveyContents,
            'ALLOW_ANONYMOUS': document.allowAnonymous,
            'RESTRICTION': document.restriction,
            'RESERVED1': document.reserved1,
            'RESERVED2': document.reserved2,
            'RESERVED3': document.reserved3,
            'RESERVED4': document.reserved4
        })
        .returning('DOCUMENT_ID', '"documentId"')
        .toParam()
    )
}

const getDocument = async(documentId) => {
    return await pool.executeQuery('getDocument',
        builder.select()
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'BOARD_ID': '"boardId"',
            'USER_ID': '"userId"',
            'IS_DELETED': '"isDeleted"',
            'COMMENT_COUNT': '"commentCount"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'VIEW_COUNT': '"viewCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'BEST_DATETIME': '"bestDateTime"',
            'TITLE': '"title"',
            'CONTENTS': '"contents"',
            'SURVEY_CONTENTS': '"surveyContents"',
            'RESTRICTION': '"restriction"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .from('SS_MST_DOCUMENT')
        .where('DOCUMENT_ID = ?', documentId)
        .toParam()
    );
}

exports.getDocument = getDocument;
exports.getUserDocument = async(userId, page = 1) => {
    return await pool.executeQuery('getUserDocument',
        builder.select()
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'BOARD_ID': '"boardId"',
            'USER_ID': '"userId"',
            'IS_DELETED': '"isDeleted"',
            'COMMENT_COUNT': '"commentCount"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'VIEW_COUNT': '"viewCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'BEST_DATETIME': '"bestDateTime"',
            'TITLE': '"title"',
            'CONTENTS': '"contents"',
            'SURVEY_CONTENTS': '"surveyContents"',
            'RESTRICTION': '"restriction"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .from('SS_MST_DOCUMENT')
        .where('USER_ID = ?', userId)
        .order('DOCUMENT_ID', false)
        .offset((page - 1) * 15)
        .limit(15)
        .toParam()
    );
}

exports.getNickNameDocument = async(nickName, boardType, page = 1) => {
    const user = await userModel.getUserIdByNickName(nickName, boardType);
    if (!user || !(user[0])) {
        return [];
    }
    return await pool.executeQuery('getNickNameDocument',
        builder.select()
        .with('BOARDS', builder.select().field('BOARD_ID').from('SS_MST_BOARD').where('BOARD_TYPE = ?', boardType))
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'DOCUMENT.BOARD_ID': '"boardId"',
            'USER_NICKNAME': '"nickName"',
            'COMMENT_COUNT': '"commentCount"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'VIEW_COUNT': '"viewCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'TITLE': '"title"',
            'CONTENTS': '"contents"',
            'RESTRICTION': '"restriction"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .from('SS_MST_DOCUMENT', 'DOCUMENT')
        .where('DOCUMENT.BOARD_ID IN (SELECT BOARD_ID FROM BOARDS)')
        .where('USER_NICKNAME = ?', nickName)
        .where('USER_ID = ?', user[0].userId)
        .where('IS_DELETED = false')
        .where('IS_ANONYMOUS = false')
        .order('WRITE_DATETIME', false)
        .limit(10)
        .offset((page - 1) * 10)
        .toParam()
    )
}
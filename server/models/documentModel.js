const pool = require('./db').instance,
    builder = require('./db').builder;
const util = require('../util'),
    cache = require('../cache');
const boardModel = require('./boardModel'),
    userModel = require('./userModel');

exports.getDocuments = async (boardId, documentId, searchQuery, searchTarget, sortTarget, isAscending = false, page, isAdmin = false, category = null, targetYear = null, rowsPerPage = 20) => {
    if (!boardId) {
        return [];
    }
    if (!documentId && !searchQuery && !searchTarget && !sortTarget && !isAscending && !category && !targetYear) {
        let cachedData = await cache.getAsync('[document]' + boardId + '@' + (page || '') + '/' + rowsPerPage);
        if (cachedData) {//array itself
            return cachedData;
        }
    }
    let query = builder.select()
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'BOARD_ID': '"boardId"',
            'COMMENT_COUNT': '"commentCount"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VIEW_COUNT': '"viewCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'TITLE': '"title"',
            'count(*) OVER()': '"totalCount"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .from('SS_MST_DOCUMENT')
    if (!isAdmin) {
        query.where('IS_DELETED = false');
    }
    if (typeof boardId === 'string') {
        query.where('BOARD_ID = ?', boardId)
    } else if (Array.isArray(boardId)) { //array
        query.where('BOARD_ID IN ?', boardId)
    }
    if (category) {
        query.where('CATEGORY = ?', category)
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
    if (targetYear) {
        query.where('WRITE_DATETIME BETWEEN ? AND ?', util.moment(targetYear, 'YYYY').startOf('year').format('YMMDDHHmmss'), util.moment(targetYear, 'YYYY').endOf('year').format('YMMDDHHmmss'))
    }
    switch (sortTarget) {
        case 'viewCount':
            query.order('VIEW_COUNT', isAscending)
            break;
        case 'voteCount':
            query.order('VOTE_UP_COUNT', isAscending)
            break;
        case 'writeDateTime':
        default:
            query.order('WRITE_DATETIME', isAscending)
            break;
    }

    //find page
    if (!page && documentId) {
        //around documentId
        let withQuery = builder.select().field('DOCUMENT_ID');
        switch (sortTarget) {
            case 'viewCount':
                withQuery.field(`ROW_NUMBER() OVER (ORDER BY VIEW_COUNT ${isAscending ? 'ASC' : 'DESC'})`, 'NUM')
                break;
            case 'voteCount':
                withQuery.field(`ROW_NUMBER() OVER (ORDER BY VOTE_UP_COUNT ${isAscending ? 'ASC' : 'DESC'})`, 'NUM')
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
        if (typeof boardId === 'string') {
            withQuery.where('BOARD_ID = ?', boardId)
        } else if (Array.isArray(boardId)) { //array
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
        if (category) {
            withQuery.where('CATEGORY = ?', category)
        }
        if (targetYear) {
            withQuery.where('WRITE_DATETIME BETWEEN ? AND ?', util.moment(targetYear, 'YYYY').startOf('year').format('YMMDDHHmmss'), util.moment(targetYear, 'YYYY').endOf('year').format('YMMDDHHmmss'))
        }
        const pages = await pool.executeQuery('findDocumentPage' + (isAdmin ? 'admin' : '') + (boardId ? (typeof boardId === 'object' ? boardId.length : '') + 'board' : '') + (searchQuery ? (searchTarget === 'title' ? 'title' : (searchTarget === 'contents' ? 'contents' : (searchTarget === 'titleContents' ? 'titleContents' : ''))) : '') + (isAscending ? 'asc' : 'desc') + (category ? 'cat' : '') + (targetYear),
            builder.select().with('DOCUMENTS', withQuery).field('CEIL(NUM/10.0)', '"page"').from('DOCUMENTS').where('DOCUMENT_ID = ?', documentId)
                .toParam()
        );
        if (Array.isArray(pages) && pages.length === 1 && pages[0].page) {
            page = pages[0].page;
        } else { //document가 해당 board에 없을 경우/삭제되었을 경우 등등
            page = 1;
        }
    } else if (!util.isNumeric(page)) {
        page = 1;
    }

    //select documents
    let result = await pool.executeQuery('getDocuments' + (isAdmin ? 'admin' : '') + (boardId ? (typeof boardId === 'object' ? boardId.length : '') + 'board' : '') + (searchQuery ? (searchTarget === 'title' ? 'title' : (searchTarget === 'contents' ? 'contents' : (searchTarget === 'titleContents' ? 'titleContents' : ''))) : '') + (isAscending ? 'asc' : 'desc') + (category ? 'cat' : '') + (targetYear),
        query.limit(rowsPerPage).offset((page - 1) * rowsPerPage)
            .toParam()
    )
    if (!documentId && !searchQuery && !searchTarget && !sortTarget && !isAscending && !category && !targetYear) {
        cache.setAsync('[document]' + boardId + '@' + (page || '') + '/' + rowsPerPage, result, 30);//maintain in 30 sec
    }
    return result;
}

exports.getBestDocuments = async (documentId, boardType, searchQuery, searchTarget, page, rowsPerPage = 20) => {
    if (!documentId && !searchQuery && !searchTarget) {
        let cachedData = await cache.getAsync('[best]' + boardType + '@' + (page || '') + rowsPerPage);
        if (cachedData) {//array itself
            return cachedData;
        }
    }
    let query = builder.select()
        .with('BOARDS', builder.select().field('BOARD_ID').from('SS_MST_BOARD').where('BOARD_TYPE ' + (boardType === 'L'? '<> \'T\'' : ' = \'T\'')).where('ALL_GROUP_AUTH = \'READONLY\''))
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'DOCUMENT.BOARD_ID': '"boardId"',
            'COMMENT_COUNT': '"commentCount"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VIEW_COUNT': '"viewCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'TITLE': '"title"',
            'count(*) OVER()': '"totalCount"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .from('SS_MST_DOCUMENT', 'DOCUMENT')
        .where('IS_DELETED = false')
        .where('BEST_DATETIME IS NOT NULL')
        .where('DOCUMENT.BOARD_ID IN (SELECT BOARD_ID FROM BOARDS)')
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
        let withQuery = builder.select()
            .with('BOARDS', builder.select().field('BOARD_ID').from('SS_MST_BOARD').where('BOARD_TYPE ' + (boardType === 'L'? '<> \'T\'' : ' = \'T\'')).where('ALL_GROUP_AUTH = \'READONLY\''))
            .field('DOCUMENT.DOCUMENT_ID')
            .field(builder.rstr('ROW_NUMBER() OVER (ORDER BY BEST_DATETIME DESC)'), 'NUM')
            .from('SS_MST_DOCUMENT', 'DOCUMENT')
            .where('IS_DELETED = false')
            .where('BEST_DATETIME IS NOT NULL')
            .where('DOCUMENT.BOARD_ID IN (SELECT BOARD_ID FROM BOARDS)')
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
        const pages = await pool.executeQuery('findDocumentPage' + boardType + (searchQuery ? (searchTarget === 'title' ? 'title' : (searchTarget === 'contents' ? 'contents' : (searchTarget === 'titleContents' ? 'titleContents' : ''))) : ''),
            builder.select().with('DOCUMENTS', withQuery).field('CEIL(NUM/10.0)', '"page"').from('DOCUMENTS').where('DOCUMENT_ID = ?', documentId).order('BEST_DATETIME', false)
                .toParam()
        );
        if (Array.isArray(pages) && pages.length === 1 && pages[0].page > 0) {
            page = pages[0].page;
        } else { //해당 document가 board에 없을 경우/ 삭제되었을 경우 등등
            page = 1;
        }
    }
    if (!page) {
        page = 1;
    }

    let result = await pool.executeQuery('getBestDocument' + boardType + (searchQuery ? (searchTarget === 'title' ? 'title' : (searchTarget === 'contents' ? 'contents' : (searchTarget === 'titleContents' ? 'titleContents' : ''))) : ''),
        query.order('BEST_DATETIME', false).limit(rowsPerPage).offset((page - 1) * rowsPerPage)
            .toParam()
    )
    if (Array.isArray(result) && !documentId && !searchQuery && !searchTarget) {
        cache.setAsync('[best]' + boardType + '@' + (page || '') + rowsPerPage, result, 60);//maintain in 60 sec
    }
    return result;
}

exports.getPeriodicallyBestDocuments = async (boardType, since) => {
    let cachedData = await cache.get('[period]' + boardType + since);
    if (cachedData) {//array itself
        return cachedData;
    }
    cachedData = await pool.executeQuery('getPeriodicallyBestDocuments',
        builder.select()
            .with('BOARDS', builder.select().field('BOARD_ID').from('SS_MST_BOARD').where('BOARD_TYPE = ?', boardType).where('ALL_GROUP_AUTH = \'READONLY\''))
            .fields({
                'DOCUMENT_ID': '"documentId"',
                'BOARD_ID': '"boardId"',
                'VOTE_UP_COUNT': '"voteUpCount"',
                'WRITE_DATETIME': '"writeDateTime"',
                'COMMENT_COUNT': '"commentCount"',
                'TITLE': '"title"',
            })
            .from('SS_MST_DOCUMENT', 'DOCUMENT')
            .where('WRITE_DATETIME >= ?', since)
            .where('DOCUMENT.BOARD_ID IN (SELECT BOARD_ID FROM BOARDS)')
            .order('VOTE_UP_COUNT', false)
            .order('WRITE_DATETIME', false)
            .limit(10)
            .toParam()
    )
    if (Array.isArray(cachedData)) {
        cache.setAsync('[period]' + boardType + since, cachedData, 30 * 60);//maintain in 30 minutes
    }
    return cachedData;
}

exports.updateDocument = async (document) => {
    if (!document.documentId) {
        return 0;
    }
    let query = builder.update().table('SS_MST_DOCUMENT');
    if (document.title !== undefined && document.title !== '') {
        query.set('TITLE', document.title)
    }
    if (document.contents !== undefined) {
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
    if (document.hasSurvey !== undefined) {
        query.set('HAS_SURVEY', document.hasSurvey)
    }
    if (document.category !== undefined) {
        query.set('CATEGORY', document.category)
    }
    if (document.hasAttach !== undefined) {
        query.set('HAS_ATTACH', document.hasAttach)
    }
    if (document.bestDateTime !== undefined) {
        query.set('BEST_DATETIME', document.bestDateTime)
    }
    if (document.restriction !== undefined) {
        query.set('RESTRICTION', document.restriction)
    }
    if (document.reserved1 !== undefined) {
        query.set('RESERVED1', document.reserved1)
    }
    if (document.reserved2 !== undefined) {
        query.set('RESERVED1', document.reserved2)
    }
    if (document.reserved3 !== undefined) {
        query.set('RESERVED1', document.reserved3)
    }
    if (document.reserved4 !== undefined) {
        query.set('RESERVED1', document.reserved4)
    }
    return await pool.executeQuery(null,
        query.where('DOCUMENT_ID = ?', document.documentId)
            .toParam()
    );
}

exports.deleteDocument = async (documentId) => {
    return await pool.executeQuery('deleteDocument',
        builder.delete()
            .from('SS_MST_DOCUMENT')
            .where('DOCUMENT_ID = ?', documentId)
            .toParam()
    )
}

exports.createDocument = async (document) => {
    return await pool.executeQuery('createDocument',
        builder.insert()
            .into('SS_MST_DOCUMENT')
            .setFields({
                'DOCUMENT_ID': builder.rstr('nextval(\'SEQ_SS_MST_DOCUMENT\')'),
                'BOARD_ID': document.boardId,
                'USER_ID': document.userId,
                'USER_NICKNAME': document.userNickName,
                'IS_ANONYMOUS': document.isAnonymous,
                'WRITE_DATETIME': util.getYYYYMMDDHH24MISS(),
                'TITLE': document.title,
                'CONTENTS': document.contents,
                'ALLOW_ANONYMOUS': document.allowAnonymous,
                'RESTRICTION': JSON.stringify(document.restriction),
                'HAS_SURVEY': !!document.survey,
                'HAS_ATTACH': !!document.hasAttach,
                'CATEGORY_NAME': document.categoryName,
                'RESERVED1': document.reserved1,
                'RESERVED2': document.reserved2,
                'RESERVED3': document.reserved3,
                'RESERVED4': document.reserved4
            })
            .returning('DOCUMENT_ID', '"documentId"')
            .toParam()
    )
}

const getDocument = async (documentId) => {
    return await pool.executeQuery('getDocument2',
        builder.select()
            .fields({
                'MDOCUMENT.DOCUMENT_ID': '"documentId"',
                'BOARD_ID': '"boardId"',
                'USER_ID': '"userId"',
                'IS_DELETED': '"isDeleted"',
                'COMMENT_COUNT': '"commentCount"',
                'REPORT_COUNT': '"reportCount"',
                'VOTE_UP_COUNT': '"voteUpCount"',
                'VIEW_COUNT': '"viewCount"',
                'WRITE_DATETIME': '"writeDateTime"',
                'BEST_DATETIME': '"bestDateTime"',
                'TITLE': '"title"',
                'RESTRICTION': '"restriction"',
                'ALLOW_ANONYMOUS': '"allowAnonymous"',
                'HAS_SURVEY': '"hasSurvey"',
                'HAS_ATTACH': '"hasAttach"',
                'CATEGORY_NAME': '"categoryName"',
                'RESERVED1': '"reserved1"',
                'RESERVED2': '"reserved2"',
                'RESERVED3': '"reserved3"',
                'RESERVED4': '"reserved4"',
                'ATTACH.ATTACHMENTS': '"attach"'
            })
            .field(builder.case().when('IS_ANONYMOUS = true').then('').else(builder.rstr('USER_NICKNAME')), '"nickName"')
            .field(builder.case().when('IS_DELETED = true').then('삭제된 글입니다.').else(builder.rstr('CONTENTS')), '"contents"')
            .from(builder.select().from('SS_MST_DOCUMENT')
                .where('DOCUMENT_ID = ?', documentId), 'MDOCUMENT')
            .left_join(builder.select()
                .field('SDOCUMENT.DOCUMENT_ID', 'DOCUMENT_ID')
                .field('json_agg(ATTACH)', 'ATTACHMENTS')
                .from('SS_MST_DOCUMENT', 'SDOCUMENT')
                .left_join('SS_MST_DOCUMENT_ATTACH', 'ATTACH', 'ATTACH.DOCUMENT_ID = SDOCUMENT.DOCUMENT_ID')
                .group('SDOCUMENT.DOCUMENT_ID'), 'ATTACH', 'ATTACH.DOCUMENT_ID = MDOCUMENT.DOCUMENT_ID')
            .toParam()
    );
}

exports.getDocument = getDocument;
exports.getUserDocument = async (userId, isAdmin, page = 1) => {
    let query = builder.select()
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'BOARD_ID': '"boardId"',
            'USER_ID': '"userId"',
            'IS_DELETED': '"isDeleted"',
            'COMMENT_COUNT': '"commentCount"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VIEW_COUNT': '"viewCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'BEST_DATETIME': '"bestDateTime"',
            'TITLE': '"title"',
            'CONTENTS': '"contents"',
            'RESTRICTION': '"restriction"',
            'HAS_SURVEY': '"hasSurvey"',
            'HAS_ATTACH': '"hasAttach"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"',
            'count(*) OVER()': '"totalCount"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .from('SS_MST_DOCUMENT')
        .where('USER_ID = ?', userId);
    if (!isAdmin) {
        query.where('IS_DELETED = false')
    }
    return await pool.executeQuery('getUserDocument' + (isAdmin ? 'admin' : ''),
        query
            .order('DOCUMENT_ID', false)
            .offset((page - 1) * 15)
            .limit(15)
            .toParam()
    );
}

exports.getNickNameDocument = async (nickName, boardType, page = 1) => {
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
                'VIEW_COUNT': '"viewCount"',
                'WRITE_DATETIME': '"writeDateTime"',
                'TITLE': '"title"',
                'CONTENTS': '"contents"',
                'RESTRICTION': '"restriction"',
                'HAS_SURVEY': '"hasSurvey"',
                'HAS_ATTACH': '"hasAttach"',
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

exports.updateDocumentCommentCount = async (documentId, count) => {
    return await pool.executeQuery('updateDocumentCommentCount' + (count > 0 ? '' : '-'),
        builder.update()
            .table('SS_MST_DOCUMENT')
            .set('COMMENT_COUNT', builder.str(`COMMENT_COUNT ${count > 0 ? '+' : '-'} 1`))
            .where('DOCUMENT_ID = ?', documentId)
            .toParam()
    )
}

exports.updateDocumentVote = async (documentId, isUp, isCancel) => {
    return await pool.executeQuery('updateDocumentVote' + (isUp ? 'up' : 'down') + (isCancel ? '1' : '0'),
        builder.update()
            .table('SS_MST_DOCUMENT')
            .set(isUp ? 'VOTE_UP_COUNT' : 'VOTE_DOWN_COUNT', builder.str(isUp ? `VOTE_UP_COUNT ${isCancel ? '-' : '+'} 1` : `VOTE_DOWN_COUNT ${isCancel ? '-' : '+'} 1`))
            .where('DOCUMENT_ID = ?', documentId)
            .returning('VOTE_UP_COUNT', '"voteUpCount"')
            .returning('VOTE_DOWN_COUNT', '"voteDownCount"')
            .toParam()
    )
}

exports.updateDocumentReport = async (documentId) => {
    return await pool.executeQuery('updateDocumentReport',
        builder.update()
            .table('SS_MST_DOCUMENT')
            .set('REPORT_COUNT', builder.str('REPORT_COUNT + 1'))
            .where('DOCUMENT_ID = ?', documentId)
            .toParam()
    )
}

exports.getDocumentAttach = async (documentId, attachId) => {
    let query = builder.select()
        .fields({
            'DOCUMENT_ID': '"documentId"',
            'ATTACH_ID': '"attachId"',
            'ATTACH_TYPE': '"attachType"',
            'ATTACH_NAME': '"attachName"',
            'ATTACH_PATH': '"attachPath"'
        })
        .from('SS_MST_DOCUMENT_ATTACH')
        .where('DOCUMENT_ID = ?', documentId);
    if (attachId) {
        query.where('ATTACH_ID = ?', attachId)
    }
    return await pool.executeQuery('getDocumentAttach' + (attachId ? 'att' : ''),
        query.toParam()
    )
}

exports.createDocumentAttach = async (documentId, attachId, attachName, attachType, attachPath) => {
    return await pool.executeQuery('createDocumentAttach',
        builder.insert()
            .into('SS_MST_DOCUMENT_ATTACH')
            .setFields({
                'DOCUMENT_ID': documentId,
                'ATTACH_ID': attachId,
                'ATTACH_NAME': attachName,
                'ATTACH_TYPE': attachType,
                'ATTACH_PATH': attachPath
            })
            .toParam()
    )
}

exports.deleteDocumentAttach = async (documentId, attachId) => {
    let query = builder.delete()
        .from('SS_MST_DOCUMENT_ATTACH')
        .where('DOCUMENT_ID = ?', documentId);
    if (attachId) {
        query.where('ATTACH_ID = ?', attachId)
    }
    return await pool.executeQuery('deleteDocumentAttach' + (attachId ? 'one' : 'all'),
        query.toParam()
    )
}

exports.createDocumentSurvey = async (documentId, surveyContents) => {
    let answer = [], i = 0;
    while (i < surveyContents.questions.length) {
        answer.push(Array(surveyContents.questions[i].choices.length).fill(0));
        i++;
    }
    return await pool.executeQuery('createDocumentSurvey',
        builder.insert()
            .into('SS_MST_DOCUMENT_SURVEY')
            .setFields({
                'DOCUMENT_ID': documentId,
                'SURVEY_CONTENTS': JSON.stringify(surveyContents),
                'SURVEY_ANSWERS': JSON.stringify(answer)
            })
            .toParam()
    )
}

exports.getDocumentSurvey = async (documentId) => {
    return await pool.executeQuery('getDocumentSurvey',
        builder.select()
            .fields({
                'DOCUMENT_ID': '"documentId"',
                'SURVEY_CONTENTS': '"surveyContents"',
                'SURVEY_ANSWERS': '"surveyAnswers"',
            })
            .function('(SELECT COUNT(*) AS "participants" FROM SS_HST_DOCUMENT_SURVEY WHERE DOCUMENT_ID = ?),', documentId) //last comma required
            .from('SS_MST_DOCUMENT_SURVEY')
            .where('DOCUMENT_ID = ?', documentId)
            .toParam()
    )
}

exports.updateDocumentSurvey = async (documentId, answers) => {
    return await pool.executeQuery('updateDocumentSurvey',
        builder.update()
            .table('SS_MST_DOCUMENT_SURVEY')
            .set('SURVEY_ANSWERS', JSON.stringify(answers))
            .where('DOCUMENT_ID = ?', documentId)
            .toParam()
    )
}

exports.createDocumentSurveyHistory = async (documentId, userId, response) => {
    return await pool.executeQuery('createDocumentSurveyHistory',
        builder.insert()
            .into('SS_HST_DOCUMENT_SURVEY')
            .setFields({
                'DOCUMENT_ID': documentId,
                'USER_ID': userId,
                'SURVEY_RESPONSE': JSON.stringify(response),
                'SURVEY_DATETIME': util.getYYYYMMDDHH24MISS()
            })
            .toParam()
    )
}

exports.getDocumentSurveyHistory = async (documentId, userId) => {
    return await pool.executeQuery('getDocumentSurveyHistory',
        builder.select()
            .field('COUNT(*)', 'count')
            .from('SS_HST_DOCUMENT_SURVEY')
            .where('DOCUMENT_ID = ?', documentId)
            .where('USER_ID = ?', userId)
            .toParam()
    )
}

exports.deleteDocumentSurvey = async (documentId) => {
    return await pool.executeQuery('deleteDocumentSurvey',
        builder.delete()
            .from('SS_MST_DOCUMENT_SURVEY')
            .where('DOCUMENT_ID = ?', documentId)
            .toParam()
    )
}

exports.deleteDocumentSurveyHistory = async (documentId, userId) => {
    let query = builder.delete()
        .from('SS_HST_DOCUMENT_SURVEY')
        .where('DOCUMENT_ID = ?', documentId)
    if (userId) {
        query.where('USER_ID = ?', userId)
    }
    return await pool.executeQuery('deleteDocumentSurveyHistory' + (userId ? 'user' : 'all'),
        query.toParam()
    )
}

exports.createDocumentViewLog = async (documentId, userId) => {
    let result = await pool.executeQuery('updateDocumentViewCount',
        builder.update()
            .table('SS_MST_DOCUMENT')
            .set('VIEW_COUNT', builder.str('VIEW_COUNT + 1'))
            .where('DOCUMENT_ID = ?', documentId)
            .returning('VIEW_COUNT', '"viewCount"')
            .toParam()
    );
    if (result.rowCount === 1 && result.rows[0].viewCount > 0) {
        return await pool.executeQuery('createDocumentViewLog',
            builder.insert()
                .into('SS_HST_DOCUMENT_VIEW')
                .setFields({
                    'DOCUMENT_ID': documentId,
                    'USER_ID': userId,
                    'VIEW_ORDER': result.rows[0].viewCount,
                    'VIEW_TIMESTAMP': builder.rstr('current_timestamp')
                })
                .returning('VIEW_ORDER', '"viewCount"')
                .toParam()
        )
    } else {
        return result;
    }
}
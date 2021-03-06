const pool = require('./db').instance,
    builder = require('./db').builder;
const constants = require('../constants'),
    util = require('../util'),
    cache = require('../cache');

exports.checkBoardId = async (boardId) => {
    if (constants.reserved.includes(boardId)) {
        return [{ count: 1 }];
    }
    return await pool.executeQuery('checkBoardId',
        builder.select()
            .field('COUNT(*)', 'count')
            .from('SS_MST_BOARD')
            .where('BOARD_ID = ?', boardId)
            .limit(1)
            .toParam()
    );
}

exports.getBoards = async (searchQuery, boardType, page, searchTarget = "boardName", sortTarget = "orderNumber", isAscending = true, isAdmin = false) => {
    if (!searchQuery && !isAdmin && !boardType && !page && sortTarget === 'orderNumber' && isAscending) {
        let cachedData = await cache.getAsync('[getBoardList]');
        if (cachedData) {
            return cachedData;
        }
    }
    let query = builder.select().fields({
        'BOARD.BOARD_ID': '"boardId"',
        'BOARD_NAME': '"boardName"',
        'OWNER_ID': '"ownerId"',
        'BOARD_DESCRIPTION': '"boardDescription"',
        'BOARD_TYPE': '"boardType"',
        'BOARD.STATUS': '"status"',
        'ALL_GROUP_AUTH': '"allGroupAuth"',
        'ALLOW_ANONYMOUS': '"allowAnonymous"',
        'USE_CATEGORY': '"useCategory"',
        'PARENT_BOARD_ID': '"parentBoardId"',
        'RECENT_ORDER': '"recentOrder"',
        'BOARD.ORDER_NUMBER': '"orderNumber"',
        'STATUS_AUTH': '"statusAuth"',
        'RESERVED_DATE': '"reservedDate"',
        'RESERVED_CONTENTS': '"reservedContents"',
        'NOTICES':'"notices"',
        'array_agg(DISTINCT CAT.CATEGORY_NAME)': '"categories"',
        'array_agg(DISTINCT AUTH.ALLOWED_GROUP_ID)': '"allowedGroups"'
    })
        .from('SS_MST_BOARD', 'BOARD')
        .left_join('SS_MST_BOARD_AUTH', 'AUTH', 'AUTH.BOARD_ID = BOARD.BOARD_ID')
        .left_join('SS_MST_GROUP', 'MGROUP', 'AUTH.ALLOWED_GROUP_ID = MGROUP.GROUP_ID AND MGROUP.IS_OPEN_TO_USERS = true')
        .left_join('SS_MST_BOARD_CATEGORY', 'CAT', 'CAT.BOARD_ID = BOARD.BOARD_ID')

    if (!isAdmin) {
        query.where('BOARD.STATUS <> \'DELETED\'')
    }
    if (searchQuery) {
        if (searchTarget === 'boardName') {
            query.where('BOARD_NAME LIKE \'%\'||?||\'%\'', searchQuery)
        } else if (searchTarget === 'boardId') {
            query.where('BOARD.BOARD_ID LIKE \'%\'||?||\'%\'', searchQuery)
        }
    }
    if (boardType) {
        query.where('BOARD_TYPE = ?', boardType)
    }
    switch (sortTarget) {
        case 'boardType':
            query.order('BOARD.BOARD_TYPE', isAscending);
            break;
        case 'status':
            query.order('BOARD.STATUS', isAscending);
            break;
        case 'boardId':
            query.order('BOARD.BOARD_ID', isAscending);
            break;
        case 'boardName':
            query.order('BOARD.BOARD_NAME', isAscending);
            break;
        default:
            query.order('BOARD.ORDER_NUMBER', isAscending)
            break;
    }
    if (isAdmin) {
        query.group('BOARD.BOARD_ID')
    }
    if (page) {
        query.limit(15).offset((page - 1) * 15)
    }
    let result = await pool.executeQuery('getBoards' + (isAdmin ? 'admin' : '') + (searchQuery ? searchTarget : '') + (boardType ? 'type' : '') + (page ? 'page' : '') + sortTarget,
        query.group('BOARD.BOARD_ID')
            .toParam()
    )
    if (Array.isArray(result) && !searchQuery && !isAdmin && !boardType && !page && sortTarget === 'orderNumber' && isAscending) {
        cache.setAsync('[getBoardList]', result, 3600);
    }
    return result;
}

exports.getUserBoard = async (userId, boardId, isAdmin) => {
    let query = builder.select()
        .fields({
            'USERBOARD.BOARD_ID': '"boardId"',
            'USERBOARD.JOIN_DATE': '"joinDate"',
            'BOARD_NAME': '"boardName"',
            'BOARD_DESCRIPTION': '"boardDescription"',
            'BOARD_TYPE': '"boardType"',
            'STATUS': '"status"',
            'RESERVED_DATE': '"reservedDate"',
            'RESERVED_CONTENTS': '"reservedContents"',
            'WRITE_RESTRICT_DATE': '"writeRestrictDate"',
            'READ_RESTRICT_DATE': '"readRestrictDate"'
        })
        .field(builder.case().when('OWNER_ID = ?', userId).then(true).else(false), '"isOwner"')
        .from('SS_MST_USER_BOARD', 'USERBOARD')
        .join('SS_MST_BOARD', 'BOARD', 'BOARD.BOARD_ID = USERBOARD.BOARD_ID')
        .where('USERBOARD.USER_ID = ?', userId);
    if (boardId) {
        query.where('USERBOARD.BOARD_ID = ?', boardId)
    }
    if (!isAdmin) {
        query.where('STATUS <> \'DELETED\'')
            .where('BOARD_TYPE = \'T\' OR WRITE_RESTRICT_DATE IS NOT NULL OR READ_RESTRICT_DATE IS NOT NULL')
    }
    return await pool.executeQuery('getUserBoard' + (boardId ? 'board' : '') + (isAdmin ? 'admin' : ''),
        query.order('USERBOARD.ORDER_NUMBER').toParam()
    )
}

exports.getReservedBoard = async () => {
    const yesterday = util.getYYYYMMDD(util.moment().add(-1, 'days'));
    return await pool.executeQuery('getReservedBoard',
        builder.select()
            .fields({
                'BOARD.BOARD_ID': '"boardId"',
                'BOARD_NAME': '"boardName"',
                'BOARD_DESCRIPTION': '"boardDescription"',
                'BOARD_TYPE': '"boardType"',
                'OWNER_ID': '"ownerId"',
                'STATUS': '"status"',
                'ALL_GROUP_AUTH': '"allGroupAuth"',
                'ALLOW_ANONYMOUS': '"allowAnonymous"',
                'USE_CATEGORY': '"useCategory"',
                'PARENT_BOARD_ID': '"parentBoardId"',
                'RECENT_ORDER': '"recentOrder"',
                'ORDER_NUMBER': '"orderNumber"',
                'STATUS_AUTH': '"statusAuth"',
                'RESERVED_DATE': '"reservedDate"',
                'RESERVED_CONTENTS': '"reservedContents"',
                'array_agg(CAT.CATEGORY_NAME)': 'categories'
            })
            .from('SS_MST_BOARD', 'BOARD')
            .left_join('SS_MST_BOARD_CATEGORY', 'CAT', 'CAT.BOARD_ID = BOARD.BOARD_ID')
            .where('RESERVED_DATE = ?', yesterday)
            .group('BOARD.BOARD_ID')
            .toParam()
    )
}

const getBoard = async (boardId) => {
    let cachedData = await cache.getAsync('[getBoard]' + boardId);
    if (cachedData) {
        return cachedData;
    }
    cachedData = await pool.executeQuery('getBoard',
        builder.select()
            .fields({
                'BOARD.BOARD_ID': '"boardId"',
                'BOARD_NAME': '"boardName"',
                'OWNER_ID': '"ownerId"',
                'BOARD_DESCRIPTION': '"boardDescription"',
                'BOARD_TYPE': '"boardType"',
                'STATUS': '"status"',
                'ALL_GROUP_AUTH': '"allGroupAuth"',
                'ALLOW_ANONYMOUS': '"allowAnonymous"',
                'USE_CATEGORY': '"useCategory"',
                'PARENT_BOARD_ID': '"parentBoardId"',
                'RECENT_ORDER': '"recentOrder"',
                'BOARD.ORDER_NUMBER': '"orderNumber"',
                'STATUS_AUTH': '"statusAuth"',
                'RESERVED_DATE': '"reservedDate"',
                'RESERVED_CONTENTS': '"reservedContents"',
                'NOTICES':'"notices"',
                'array_agg(CAT.CATEGORY_NAME)': 'categories',
                'array_agg(DISTINCT AUTH.ALLOWED_GROUP_ID)': '"allowedGroups"'
            })
            .from('SS_MST_BOARD', 'BOARD')
            .left_join('SS_MST_BOARD_AUTH', 'AUTH', 'AUTH.BOARD_ID = BOARD.BOARD_ID')
            .left_join('SS_MST_GROUP', 'MGROUP', 'AUTH.ALLOWED_GROUP_ID = MGROUP.GROUP_ID AND MGROUP.IS_OPEN_TO_USERS = true')
            .left_join('SS_MST_BOARD_CATEGORY', 'CAT', 'CAT.BOARD_ID = BOARD.BOARD_ID')
            .where('BOARD.BOARD_ID = ?', boardId)
            .group('BOARD.BOARD_ID')
            .toParam()
    );
    if (Array.isArray(cachedData)) {
        cache.setAsync('[getBoard]' + boardId, cachedData, 3600);
    }
    return cachedData;
}
exports.getBoard = getBoard;

const getBoardAuth = async (boardId) => {
    return await pool.executeQuery('getBoardAuth',
        builder.select()
            .fields({
                'ALLOWED_GROUP_ID': '"groupId"',
                'AUTH_TYPE': '"authType"'
            })
            .from('SS_MST_BOARD_AUTH')
            .where('BOARD_ID = ?', boardId)
            .toParam()
    );
}

exports.getBoardAuth = getBoardAuth;

exports.getBoardAuthName = async (boardId, isAdmin) => {
    let query = builder.select()
        .fields({
            'MGROUP.GROUP_ID': '"groupId"',
            'MGROUP.GROUP_NAME': '"groupName"',
            'AUTH.AUTH_TYPE': '"authType"'
        })
        .from('SS_MST_BOARD_AUTH', 'AUTH')
        .join('SS_MST_GROUP', 'MGROUP', 'MGROUP.GROUP_ID = AUTH.ALLOWED_GROUP_ID')
        .where('BOARD_ID = ?', boardId);
    if (!isAdmin) {
        query.where('MGROUP.IS_OPEN_TO_USERS = true')
    }
    return await pool.executeQuery('getBoardAuthName' + (isAdmin ? 'a' : ''),
        query
            .toParam()
    );
}

exports.createBoardAuth = async (boardId, groupId, authType) => {
    return await pool.executeQuery('createBoardAuth',
        builder.insert()
            .into('SS_MST_BOARD_AUTH')
            .setFields({
                'BOARD_ID': boardId,
                'ALLOWED_GROUP_ID': groupId,
                'AUTH_TYPE': authType
            })
            .toParam()
    );
}

exports.updateBoardAuth = async (boardId, groupId, authType) => {
    return await pool.executeQuery('updateBoardAuth',
        builder.update()
            .table('SS_MST_BOARD_AUTH')
            .set('AUTH_TYPE', authType)
            .where('BOARD_ID = ?', boardId)
            .where('ALLOWED_GROUP_ID = ?', groupId)
            .toParam()
    );
}

const deleteBoardAuthOnly = async (boardId) => {
    return await pool.executeQuery('deleteBoardAuth',
        builder.delete()
            .from('SS_MST_BOARD_AUTH')
            .where('BOARD_ID = ?', boardId)
            .toParam()
    );
}

exports.deleteBoardAuth = async (boardId, groupId) => {
    return await pool.executeQuery('deleteBoardAuth',
        builder.delete()
            .from('SS_MST_BOARD_AUTH')
            .where('BOARD_ID = ?', boardId)
            .where('ALLOWED_GROUP_ID = ?', groupId)
            .toParam()
    );
}

const deleteUserBoard = async (userId, boardId) => {
    let query = builder.delete()
        .from('SS_MST_USER_BOARD')
        .where('BOARD_ID = ?', boardId);
    if (userId) {
        query.where('USER_ID = ?', userId);
    }
    let result = await pool.executeQuery('deleteUserBoard' + (userId ? 'user' : ''),
        query.toParam()
    );
    if (result > 0 && userId) {
        cache.delAsync('[readUserBoard]' + userId + '@' + boardId);
        cache.delAsync('[writeUserBoard]' + userId + '@' + boardId);
    }
    return result;
};
exports.deleteUserBoard = deleteUserBoard;

exports.createUserBoard = async (userId, boardId, writeRestrictDate, readRestrictDate) => {
    let query = builder.insert()
        .into('SS_MST_USER_BOARD')
        .setFields({
            'USER_ID': userId,
            'BOARD_ID': boardId,
            'JOIN_DATE': util.getYYYYMMDD(),
            'ORDER_NUMBER': builder.str('SELECT COALESCE(MAX(ORDER_NUMBER), 0) + 1 FROM SS_MST_USER_BOARD WHERE USER_ID = ?', userId)
        })
    if (writeRestrictDate) {
        query.set('WRITE_RESTRICT_DATE', writeRestrictDate)
    }
    if (readRestrictDate) {
        query.set('READ_RESTRICT_DATE', readRestrictDate)
    }
    let result = await pool.executeQuery('createUserBoard' + (writeRestrictDate ? 'write' : '') + (readRestrictDate ? 'read' : ''),
        query.toParam()
    )
    if (result > 0) {
        cache.delAsync('[readUserBoard]' + userId + '@' + boardId);
        cache.delAsync('[writeUserBoard]' + userId + '@' + boardId);
    }
    return result;
}

exports.updateUserBoard = async (userId, boardId, orderNumber, writeRestrictDate, readRestrictDate) => {
    if (!writeRestrictDate && !readRestrictDate && !orderNumber) {
        return 0;
    }
    let query = builder.update().table('SS_MST_USER_BOARD')
    if (writeRestrictDate) {
        query.set('WRITE_RESTRICT_DATE', writeRestrictDate)
    }
    if (readRestrictDate) {
        query.set('READ_RESTRICT_DATE', readRestrictDate)
    }
    if (orderNumber) {
        query.set('ORDER_NUMBER', orderNumber)
    }
    let result = await pool.executeQuery('updateUserBoard' + (orderNumber ? 'ord' : '') + (writeRestrictDate ? 'wri' : '') + (readRestrictDate ? 'read' : ''),
        query.where('USER_ID = ?', userId)
            .where('BOARD_ID = ?', boardId)
            .toParam()
    )
    if (result > 0 && (writeRestrictDate || readRestrictDate)) {
        cache.delAsync('[readUserBoard]' + userId + '@' + boardId);
        cache.delAsync('[writeUserBoard]' + userId + '@' + boardId);
    }
    return result;
}

exports.createBoard = async (board) => {
    let result = await pool.executeQuery('createBoard',
        builder.insert()
            .into('SS_MST_BOARD')
            .setFields({
                'BOARD_ID': board.boardId,
                'BOARD_NAME': board.boardName,
                'OWNER_ID': board.ownerId,
                'BOARD_DESCRIPTION': board.boardDescription,
                'BOARD_TYPE': board.boardType,
                'USE_CATEGORY': !!board.useCategory,
                'ALLOW_ANONYMOUS': !!board.allowAnonymous,
                'ALL_GROUP_AUTH': board.allGroupAuth,
                'PARENT_BOARD_ID': board.parentBoardId,
                'RECENT_ORDER': board.recentOrder,
                'ORDER_NUMBER': board.orderNumber,
                'STATUS_AUTH': board.statusAuth,
                'NOTICES':JSON.stringify([])
            })
            .toParam()
    );
    if (result > 0) {
        cache.delAsync('[getBoard]' + board.boardId);
    }
    return result;
}

exports.deleteBoard = async (boardId) => {
    cache.delAsync('[getBoard]' + boardId);
    await deleteUserBoard(null, boardId);
    await deleteBoardAuthOnly(boardId);
    await deleteBoardCategory(boardId);
    return await pool.executeQuery('deleteBoard',
        builder.delete()
            .from('SS_MST_BOARD')
            .where('BOARD_ID = ?', boardId)
            .toParam()
    );
}

exports.updateBoard = async (board) => {
    if (!board.boardId) {
        return 0;
    }
    let query = builder.update()
        .table('SS_MST_BOARD');
    if (board.boardName !== undefined && board.boardName !== '') {
        query.set('BOARD_NAME', board.boardName)
    }
    if (board.boardDescription !== undefined) {
        query.set('BOARD_DESCRIPTION', board.boardDescription)
    }
    if (board.ownerId) {
        query.set('OWNER_ID', board.ownerId)
    }
    if (board.boardType) {
        query.set('BOARD_TYPE', board.boardType)
    }
    if (board.status) {
        query.set('STATUS', board.status)
    }
    if (board.allGroupAuth) {
        query.set('ALL_GROUP_AUTH', board.allGroupAuth)
    }
    if (board.allowAnonymous !== undefined) {
        query.set('ALLOW_ANONYMOUS', board.allowAnonymous)
    }
    if (board.useCategory !== undefined) {
        query.set('USE_CATEGORY', board.useCategory)
    }
    if (board.reservedDate !== undefined) {
        query.set('RESERVED_DATE', board.reservedDate)
    }
    if (board.reservedContents !== undefined) {
        query.set('RESERVED_CONTENTS', JSON.stringify(board.reservedContents))
    }
    if (board.parentBoardId !== undefined) {
        query.set('PARENT_BOARD_ID', board.parentBoardId)
    }
    if (board.recentOrder !== undefined) {
        query.set('RECENT_ORDER', board.recentOrder)
    }
    if (board.orderNumber !== undefined) {
        query.set('ORDER_NUMBER', board.orderNumber)
    }
    if (board.statusAuth !== undefined) {
        query.set('STATUS_AUTH', board.statusAuth)
    }
    if(board.notices !== undefined){
        query.set('NOTICES', JSON.stringify(board.notices))
    }
    let result = await pool.executeQuery(null,
        query.where('BOARD_ID = ?', board.boardId)
            .toParam()
    );
    if (result > 0) {
        cache.delAsync('[getBoard]' + board.boardId);
    }
    return result;
}

exports.checkUserBoardSubscribable = async (userId, boardId) => {
    return await pool.executeQuery('checkUserBoardSubscribable',
        builder.select()
            .field('COUNT(*)', 'count')
            .from(builder.select().field('GROUP_ID').from('SS_MST_USER_GROUP').where('USER_ID = ?', userId), 'GROUPS')
            .join(builder.select().fields(['ALLOWED_GROUP_ID', 'BOARD_ID', 'AUTH_TYPE']).from('SS_MST_BOARD_AUTH').where('BOARD_ID = ?', boardId), 'AUTH', 'AUTH.ALLOWED_GROUP_ID = GROUPS.GROUP_ID')
            .toParam()
    )
}

const checkUserBoard = async (userId, boardId) => {
    return pool.executeQuery('checkUserBoard',
        builder.select()
            .fields({
                'WRITE_RESTRICT_DATE': '"writeRestrictDate"',
                'READ_RESTRICT_DATE': '"readRistrictDate"'
            })
            .from('SS_MST_USER_BOARD')
            .where('USER_ID = ?', userId)
            .where('BOARD_ID = ?', boardId)
            .limit(1)
            .toParam()
    );
}
exports.checkUserBoardReadable = async (userId, boardId) => {
    let cachedData = await cache.getAsync('[readUserBoard]' + userId + '@' + boardId);
    if (cachedData) {
        return cachedData;
    }
    const board = await getBoard(boardId);
    if (!Array.isArray(board) || board.length === 0) {
        return [{ count: 0 }];
    } else {
        cachedData = await checkUserBoard(userId, boardId);
        if (Array.isArray(cachedData)) {
            if (cachedData.length > 0) {//subscription or sanction
                if (!cachedData[0].readRistrictDate || util.moment().isAfter(util.moment(cachedData[0].readRistrictDate, 'YYYYMMDD'))) {//no readability sanction
                    cache.setAsync('[readUserBoard]' + userId + '@' + boardId, [{ count: 1 }], 3600);
                    return [{ count: 1 }];
                } else {
                    cache.setAsync('[readUserBoard]' + userId + '@' + boardId, [{ count: 0 }], 3600);
                    return [{ count: 0 }];
                }
            } else {
                if (board[0].boardType !== 'T' || board[0].allGroupAuth !== 'NONE') {//lounge or open topic
                    cache.setAsync('[readUserBoard]' + userId + '@' + boardId, [{ count: 1 }], 3600);
                    return [{ count: 1 }];
                } else {//closed topic - need subscription
                    cache.setAsync('[readUserBoard]' + userId + '@' + boardId, [{ count: 0, needSubscription: true }], 3600);
                    return [{ count: 0, needSubscription: true }];
                }
            }
        }
        return cachedData;//error to get status
    }
}

exports.checkUserBoardWritable = async (userId, boardId) => {
    let cachedData = await cache.getAsync('[writeUserBoard]' + userId + '@' + boardId);
    if (cachedData) {
        return cachedData;
    }
    const board = await getBoard(boardId);
    if (!Array.isArray(board) || board.length === 0) {
        return [{ count: 0 }];
    } else {
        cachedData = await checkUserBoard(userId, boardId);//check sanction
        if (Array.isArray(cachedData)) {
            if (cachedData.length > 0 && cachedData[0].writeRestrictDate && util.moment().isSameOrBefore(util.moment(cachedData[0].writeRestrictDate, 'YYYYMMDD'))) {//sanction
                cache.setAsync('[writeUserBoard]' + userId + '@' + boardId, [{ count: 0 }], 3600);
                return [{ count: 0 }];
            } else if (cachedData.length === 0) {//no sanction and subscription
                if (board[0].boardType !== 'T') {
                    if (board[0].boardType === 'L') {//lounge need not subscribe. just check the user has the right group.
                        cachedData = await pool.executeQuery('checkUserLoungeWritable',
                            builder.select()
                                .field('COUNT(*)', 'count')
                                .from(builder.select().field('ALLOWED_GROUP_ID').from('SS_MST_BOARD_AUTH').where('BOARD_ID = ?', boardId).where('AUTH_TYPE = \'READWRITE\''), 'AUTH')
                                .where('ALLOWED_GROUP_ID IN (SELECT GROUP_ID FROM SS_MST_USER_GROUP WHERE USER_ID = ?)', userId)
                                .limit(1)
                                .toParam()
                        );
                        if (Array.isArray(cachedData)) {//save cache only when no error occured
                            cache.setAsync('[writeUserBoard]' + userId + '@' + boardId, cachedData, 3600);
                        }
                        return cachedData;
                    } else {//X, P, E boardType - just pass through
                        cache.setAsync('[writeUserBoard]' + userId + '@' + boardId, [{ count: 1 }], 3600);
                        return [{ count: 1 }];
                    }
                } else {
                    cache.setAsync('[writeUserBoard]' + userId + '@' + boardId, [{ count: 0, needSubscription: true }], 3600);
                    return [{ count: 0, needSubscription: true }];
                }
            } else {//no sanction and already subscribed
                cache.setAsync('[writeUserBoard]' + userId + '@' + boardId, [{ count: 1 }], 3600);
                return [{ count: 1 }];
            }
        }
        return cachedData;//error case
    }
}

exports.getBoardByDocument = async (documentId) => {
    return await pool.executeQuery('getBoardByDocument',
        builder.select()
            .fields({
                'BOARD.BOARD_ID': '"boardId"',
                'BOARD_TYPE': '"boardType"',
            })
            .from(builder.select().field('BOARD_ID').from('SS_MST_DOCUMENT').where('DOCUMENT_ID = ?', documentId), 'DOCUMENT')
            .join('SS_MST_BOARD', 'BOARD', 'BOARD.BOARD_ID = DOCUMENT.BOARD_ID')
            .toParam()
    )
}

exports.getBoardByOwnerId = async (ownerId) => {
    return await pool.executeQuery('getBoardByOwnerId',
        builder.select()
            .fields({
                'BOARD_ID': '"boardId"',
                'BOARD_NAME': '"boardName"',
                'OWNER_ID': '"ownerId"',
                'BOARD_DESCRIPTION': '"boardDescription"',
                'BOARD_TYPE': '"boardType"',
                'STATUS': '"status"',
                'ALL_GROUP_AUTH': '"allGroupAuth"',
                'ALLOW_ANONYMOUS': '"allowAnonymous"',
                'RESERVED_DATE': '"reservedDate"',
                'RESERVED_CONTENTS': '"reservedContents"'
            })
            .from('SS_MST_BOARD')
            .where('OWNER_ID = ?', ownerId)
            .toParam()
    )
}

exports.getBoardByParentBoardId = async (parentBoardId) => {
    return await pool.executeQuery('getBoardByParentBoardId',
        builder.select()
            .fields({
                'BOARD_ID': '"boardId"',
                'BOARD_NAME': '"boardName"',
                'OWNER_ID': '"ownerId"',
                'BOARD_DESCRIPTION': '"boardDescription"',
                'BOARD_TYPE': '"boardType"',
                'STATUS': '"status"',
                'ALL_GROUP_AUTH': '"allGroupAuth"',
                'ALLOW_ANONYMOUS': '"allowAnonymous"',
                'PARENT_BOARD_ID': '"parentBoardId"',
                'RESERVED_DATE': '"reservedDate"',
                'RESERVED_CONTENTS': '"reservedContents"'
            })
            .from('SS_MST_BOARD')
            .where('PARENT_BOARD_ID = ?', parentBoardId)
            .toParam()
    )
}

const deleteBoardCategory = async (boardId, categories) => {
    let query = builder.delete()
        .from('SS_MST_BOARD_CATEGORY')
        .where('BOARD_ID = ?', boardId)
    if (Array.isArray(categories) && categories.length > 0) {
        query.where('CATEGORY_NAME IN ?', categories);
    }
    return await pool.executeQuery('deleteBoardCategory' + (categories ? categories.length : ''),
        query.toParam()
    )
}

exports.deleteBoardCategory = deleteBoardCategory;

exports.createBoardCategory = async (boardId, categories) => {
    return await pool.executeQuery('createBoardCategory' + (categories.length),
        builder.insert()
            .into('SS_MST_BOARD_CATEGORY')
            .setFieldsRows(categories.map(x => { return { 'BOARD_ID': boardId, 'CATEGORY_NAME': x } }))
            .toParam()
    )
}

exports.getBoardCategory = async (boardId) => {
    return await pool.executeQuery('getBoardCategory',
        builder.select()
            .field('CATEGORY_NAME', '"categoryName"')
            .from('SS_MST_BOARD_CATEGORY')
            .where('BOARD_ID = ?', boardId)
            .toParam()
    )
}

exports.getRecentBoards = async () => {
    let cachedData = await cache.getAsync('[getRecentBoards]');
    if (cachedData) {
        return cachedData;
    }

    cachedData = await pool.executeQuery('getRecentBoards',
        builder.select()
            .fields({
                'BOARD.BOARD_ID': '"boardId"',
                'BOARD.BOARD_NAME': '"boardName"',
                'array_agg(BOARD2.BOARD_ID)': '"targetBoards"'
            })
            .from(builder.select().fields(['BOARD_ID', 'BOARD_NAME', 'RECENT_ORDER']).from('SS_MST_BOARD').where('RECENT_ORDER IS NOT NULL'), 'BOARD')
            .left_join('SS_MST_BOARD', 'BOARD2', 'BOARD2.PARENT_BOARD_ID = BOARD.BOARD_ID')
            .group('BOARD.BOARD_ID')
            .group('BOARD.BOARD_NAME')
            .order('MAX(BOARD.RECENT_ORDER)')
            .toParam()
    );
    if (Array.isArray(cachedData)) {
        let hot = await cache.getAsync('[getHotTopics]');
        if (!hot) {
            hot = await pool.executeQuery('getHotTopics',
                builder.select()
                    .fields({
                        'MBOARD.BOARD_ID': '"boardId"',
                        'MBOARD.BOARD_NAME': '"boardName"',
                    })
                    .from(builder.select()
                        .fields({ 'BOARD.BOARD_ID': 'BOARD_ID', 'BOARD.BOARD_NAME': 'BOARD_NAME', 'COUNT(*)': 'DOCUMENT_COUNT' })
                        .from('SS_MST_DOCUMENT', 'DOCUMENT')
                        .join(builder.select().fields(['BOARD_ID', 'BOARD_NAME']).from('SS_MST_BOARD', 'CBOARD').where('BOARD_TYPE = \'T\'').where('ALL_GROUP_AUTH <> \'NONE\''), 'BOARD', 'BOARD.BOARD_ID = DOCUMENT.BOARD_ID')
                        .where('WRITE_DATETIME >= ?', util.moment().add(-7, 'days').format('YMMDDHHmmss'))
                        .group('BOARD.BOARD_ID')
                        .group('BOARD.BOARD_NAME'), 'MBOARD')
                    .order('DOCUMENT_COUNT', false)
                    .limit(10)
                    .toParam()
            )
            if (Array.isArray(hot)) {
                hot = hot[Math.floor(Math.random() * hot.length)]
                cache.setAsync('[getHotTopics]', hot, 60 * 60 * 24);
            }
        }
        if (hot) {
            if (cachedData.length > 0) {
                cachedData.splice(1, 0, { ...hot, hot: true, targetBoards: [hot.boardId] })
            } else {
                cachedData.push({ ...hot, hot: true, targetBoards: [hot.boardId] })
            }
        }
        let documents, i = 0;
        while (i < cachedData.length) {
            documents = await pool.executeQuery('getRecentDocuments' + (cachedData[i].targetBoards.length),
                builder.select()
                    .fields({
                        'DOCUMENT_ID': '"documentId"',
                        'TITLE': '"title"',
                        'BOARD_ID': '"boardId"',
                        'VOTE_UP_COUNT': '"voteUpCount"',
                        'COMMENT_COUNT': '"commentCount"',
                        'WRITE_DATETIME': '"writeDateTime"'
                    })
                    .from('SS_MST_DOCUMENT')
                    .where('BOARD_ID IN ?', cachedData[i].targetBoards[0] === null ? [cachedData[i].boardId] : cachedData[i].targetBoards)
                    .order('WRITE_DATETIME', false)
                    .limit(10)
                    .toParam()
            )
            cachedData[i].documents = documents;
            i++;
        }
        cache.setAsync('[getRecentBoards]', cachedData, 60 * 30);
    }
    return cachedData;
}

exports.getBoardMember = async (boardId, boardType) => {
    return await pool.executeQuery('getBoardMember' + boardType,
        builder.select()
            .field(boardType === 'T' ? 'TOPIC_NICKNAME' : 'LOUNGE_NICKNAME', '"nickName"')
            .from('SS_MST_USER_BOARD', 'UBOARD')
            .join('SS_MST_USER', 'MUSER', 'MUSER.USER_ID = UBOARD.USER_ID')
            .where('UBOARD.BOARD_ID = ?', boardId)
            .toParam()
    )
}

exports.getTopicRatings = async() => {
    let lastweek = util.moment().add(-7, 'days').format('YMMDD') + '000000';
    let lastmonth = util.moment().add(-1, 'months').format('YMM') + '00';
    return await pool.executeQuery('getTopicRatings', 
        builder.select()
            .fields({
                'U.BOARD_ID':'"boardId"',
                'coalesce(U.USER_COUNT, 0)':'"userCount"',
                'coalesce(C.RECENT_USER_COUNT, 0)':'"recentUserCount"',
                'coalesce(D.DOCUMENT_COUNT, 0)':'"documentCount"'
            })
            .from(
                builder.select()
                    .fields({
                        'BOARD.BOARD_ID':'BOARD_ID',
                        'COUNT(*)':'USER_COUNT'
                    })
                    .from('SS_MST_BOARD', 'BOARD')
                    .left_join('SS_MST_USER_BOARD', 'UBOARD', 'BOARD.BOARD_ID = UBOARD.BOARD_ID')
                    .where('BOARD.BOARD_TYPE = \'T\'')
                    .where('BOARD.BOARD_ID <> \'topicBest\'')
                    .group('BOARD.BOARD_ID')
                , 'U'
            )
            .left_join(
                builder.select()
                    .fields({
                        'BOARD2.BOARD_ID':'BOARD_ID',
                        'COUNT(*)':'RECENT_USER_COUNT'
                    })
                    .from('SS_MST_BOARD', 'BOARD2')
                    .left_join('SS_MST_USER_BOARD', 'UBOARD2', 'BOARD2.BOARD_ID = UBOARD2.BOARD_ID')
                    .where('BOARD2.BOARD_TYPE = \'T\'')
                    .where('BOARD2.BOARD_ID <> \'topicBest\'')
                    .where('UBOARD2.JOIN_DATE > ?', lastmonth)
                    .group('BOARD2.BOARD_ID')
                , 'C', 'U.BOARD_ID = C.BOARD_ID'
            )
            .left_join(
                builder.select()
                    .fields({
                        'BOARD3.BOARD_ID':'BOARD_ID',
                        'COUNT(*)':'DOCUMENT_COUNT'
                    })
                    .from('SS_MST_BOARD', 'BOARD3')
                    .left_join(builder.select().fields(['DOCUMENT_ID', 'BOARD_ID']).from('SS_MST_DOCUMENT', 'DOC').where('WRITE_DATETIME > ?', lastweek), 'DOCS', 'DOCS.BOARD_ID = BOARD3.BOARD_ID')
                    .where('BOARD3.BOARD_TYPE = \'T\'')
                    .where('BOARD3.BOARD_ID <> \'topicBest\'')
                    .group('BOARD3.BOARD_ID')
                , 'D', 'U.BOARD_ID = D.BOARD_ID'
            )
        .toParam()
    );
}
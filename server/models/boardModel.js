const pool = require('./db').instance,
    builder = require('./db').builder;
const constants = require('../constants'),
    util = require('../util');
const groupModel = require('./groupModel');

exports.checkBoardId = async(boardId) => {
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

exports.getBoards = async(searchQuery, boardType, page = 1, searchTarget = "boardName", sortTarget = "boardName", isAscending = true) => {
    let query = builder.select().fields({
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
        .from('SS_MST_BOARD');
    if (searchQuery) {
        if (searchTarget === 'boardName') {
            query.where('BOARD_NAME LIKE \'%\'||?||\'%\'', searchQuery)
        }
    }
    if (boardType) {
        query.where('BOARD_TYPE = ?', boardType)
    }
    switch (sortTarget) {
        case 'boardType':
            query.order('BOARD_TYPE', isAscending);
            break;
        case 'status':
            query.order('STATUS', isAscending);
            break;
        case 'boardName':
        default:
            query.order('BOARD_NAME', isAscending);
            break;
    }
    return await pool.executeQuery('getBoards' + (searchQuery && searchTarget === 'boardName' ? 'name' : '') + (boardType ? 'type' : ''),
        query.limit(15).offset((page - 1) * 15)
        .toParam()
    )
}

exports.getUserBoards = async(userId) => {
    return await pool.executeQuery('getUserBoards',
        builder.select()
        .fields({
            'USERBOARD.BOARD_ID': '"boardId"',
            'USERBOARD.JOIN_DATE': '"joinDate"',
            'BOARD_NAME': '"boardName"',
            'OWNER_ID': '"ownerId"',
            'BOARD_DESCRIPTION': '"boardDescription"',
            'BOARD_TYPE': '"boardType"',
            'STATUS': '"status"',
            'ALLOW_ANONYMOUS': '"allowAnonymous"',
            'RESERVED_DATE': '"reservedDate"',
            'RESERVED_CONTENTS': '"reservedContents"'
        })
        .from('SS_MST_USER_BOARD', 'USERBOARD')
        .join('SS_MST_BOARD', 'BOARD', 'BOARD.BOARD_ID = USERBOARD.BOARD_ID')
        .where('USERBOARD.USER_ID = ?', userId))
}

const getBoard = async(boardId) => {
    return await pool.executeQuery('getBoard',
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
        .where('BOARD_ID = ?', boardId)
        .toParam()
    );
}
exports.getBoard = getBoard;

const getBoardAuth = async(boardId) => {
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

exports.createBoardAuth = async(boardId, groupId, authType) => {
    return await pool.executeQuery('createBoardAuth',
        builder.insert()
        .into('SS_MST_BOARD_AUTH')
        .setFields({
            'BOARD_ID': boardId,
            'GROUP_ID': groupId,
            'AUTH_TYPE': authType
        })
        .toParam()
    );
}

exports.updateBoardAuth = async(boardId, groupId, authType) => {
    return await pool.executeQuery('updateBoardAuth',
        builder.update()
        .table('SS_MST_BOARD_AUTH')
        .set('AUTH_TYPE', authType)
        .where('BOARD_ID = ?', boardId)
        .where('ALLOWED_GROUP_ID = ?', groupId)
        .toParam()
    );
}

exports.deleteBoardAuth = async(boardId, groupId) => {
    return await pool.executeQuery('deleteBoardAuth',
        builder.delete()
        .from('SS_MST_BOARD_AUTH')
        .where('BOARD_ID = ?', boardId)
        .where('GROUP_ID = ?', groupId)
        .toParam()
    );
}

const deleteUserBoard = async(userId, boardId) => {
    const board = (await getBoard(boardId))[0];
    if (!board || board.ownerId === userId) { //소유자 이전 후 삭제 가능
        return 0;
    }
    let query = builder.delete()
        .from('SS_MST_USER_BOARD')
        .where('BOARD_ID = ?', boardId);
    if (userId) {
        query.where('USER_ID = ?', userId);
    }
    return await pool.executeQuery('deleteUserBoard' + (userId ? 'user' : ''),
        query.toParam()
    );
};
exports.deleteUserBoard = deleteUserBoard;

exports.createUserBoard = async(userId, boardId) => {
    const board = (await getBoard(boardId))[0];
    if (!board) {
        return 0;
    }
    if (board.allGroupAuth === 'NONE') {
        const groups = (await groupModel.getUserGroup(userId)).map(x => x.groupId);
        let auths = await getBoardAuth(boardId);
        if (auths.filter(x => groups.includes(x)).length < 1) {
            return 0;
        }
    }
    return await pool.executeQuery('createUserBoard',
        builder.insert()
        .into('SS_MST_USER_BOARD')
        .setFields({
            'USER_ID': userId,
            'BOARD_ID': boardId,
            'JOIN_DATE': util.getYYYYMMDD(),
            'ORDER_NUMBER': builder.str('SELECT COALESCE(MAX(ORDER_NUMBER), 0) + 1 FROM SS_MST_USER_BOARD WHERE USER_ID = ?', userId)
        })
        // .fromQuery(['USER_ID', 'BOARD_ID', 'JOIN_DATE', 'ORDER_NUMBER'],
        //     builder.select()
        //     .field(builder.str('?', userId), 'USER_ID')
        //     .field(builder.str('?', boardId), 'BOARD_ID')
        //     .field(builder.str('?', util.getYYYYMMDD()), 'JOIN_DATE')
        //     .field('MAX(COALESCE(ORDER_NUMBER, 0)) + 1', 'ORDER_NUMBER')
        //     .from('SS_MST_USER_BOARD')
        //     .where('USER_ID = ?', userId)
        // )
        .toParam()
    )
}

exports.createBoard = async(board) => {
    return await pool.executeQuery('createBoard',
        builder.insert()
        .into('SS_MST_BOARD')
        .setFields({
            'BOARD_ID': board.boardId,
            'BOARD_NAME': board.boardName,
            'OWNER_ID': board.ownerId,
            'BOARD_DESCRIPTION': board.boardDescription,
            'BOARD_TYPE': board.boardType,
            'ALLOW_ANONYMOUS': board.allowAnonymous,
            'ALL_GROUP_AUTH': board.allGroupAuth
        })
        .toParam()
    );
}

exports.deleteBoard = async(boardId) => {
    await deleteUserBoard(null, boardId);
    return await pool.executeQuery('deleteBoard',
        builder.delete()
        .from('SS_MST_BOARD')
        .where('BOARD_ID = ?', boardId)
        .toParam()
    );
}

exports.updateBoard = async(board) => {
    if (!board.boardId) {
        return 0;
    }
    let query = builder.update()
        .table('SS_MST_BOARD');
    if (board.boardName) {
        query.set('BOARD_NAME', board.boardName)
    }
    if (board.boardDescription) {
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
    if (board.reservedDate) {
        query.set('RESERVED_DATE', board.reservedDate)
    }
    if (board.reservedContents) {
        query.set('RESERVED_CONTENTS', board.reservedContents)
    }
    return await pool.executeQuery(null,
        query.where('BOARD_ID = ?', board.boardId)
        .toParam()
    );
}

exports.getUserBoardAuth = async(userId, boardId) => {
    return await pool.executeQuery('getUserBoardAuth',
        builder.select()
        .field('AUTH_TYPE', '"authType"')
        .from(builder.select().field('GROUP_ID').from('SS_MST_USER_GROUP').where('USER_ID = ?', userId), 'GROUPS')
        .join(builder.select().fields(['ALLOWED_GROUP_ID', 'BOARD_ID', 'AUTH_TYPE']).from('SS_MST_BOARD_AUTH').where('BOARD_ID = ?', boardId), 'AUTH', 'AUTH.ALLOWED_GROUP_ID = GROUPS.GROUP_ID')
    )
}

exports.checkUserBoardReadable = async(userId, boardId) => {
    const board = await getBoard(boardId);
    if (!board || !board[0]) {
        return [{ count: 0 }];
    } else if (board[0].allGroupAuth !== 'NONE') {
        return [{ count: 1 }];
    } else {
        return pool.executeQuery('checkUserBoardReadable',
            builder.select()
            .field('COUNT(*)', 'count')
            .from(builder.select().field('ALLOWED_GROUP_ID').from('SS_MST_BOARD_AUTH').where('BOARD_ID = ?', boardId), 'AUTH')
            .where('ALLOWED_GROUP_ID IN (SELECT GROUP_ID FROM SS_MST_USER_GROUP WHERE USER_ID = ?)', userId)
            .limit(1)
            .toParam()
        );
    }
}

exports.checkUserBoardWritable = async(userId, boardId) => {
    const board = await getBoard(boardId);
    if (!board || !board[0]) {
        return [{ count: 0 }];
    } else if (board[0].allGroupAuth === 'READWRITE') {
        return [{ count: 1 }];
    } else {
        return pool.executeQuery('checkUserBoardReadable',
            builder.select()
            .field('COUNT(*)', 'count')
            .from(builder.select().field('ALLOWED_GROUP_ID').from('SS_MST_BOARD_AUTH').where('BOARD_ID = ?', boardId).where('AUTH_TYPE = \'READWRITE\''), 'AUTH')
            .where('ALLOWED_GROUP_ID IN (SELECT GROUP_ID FROM SS_MST_USER_GROUP WHERE USER_ID = ?)', userId)
            .limit(1)
            .toParam()
        );
    }
}

exports.getBoardByDocument = async(documentId) => {
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
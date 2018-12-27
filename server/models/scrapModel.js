const pool = require('./db').instance,
    builder = require('./db').builder;

exports.getScraps = async(userId, scrapGroupId, page = 1) => {
    return await pool.executeQuery('getScraps',
        builder.select()
        .fields({
            'DOCUMENT.DOCUMENT_ID': '"documentId"',
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
            'RESERVED4': '"reserved4"',
            'count(*) OVER()': '"totalCount"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .from(builder.select().fields(['DOCUMENT_ID']).from('SS_HST_USER_SCRAP').where('USER_ID = ?', userId).where('SCRAP_GROUP_ID = ?', scrapGroupId), 'SUSER')
        .join('SS_MST_DOCUMENT', 'DOCUMENT', 'DOCUMENT.DOCUMENT_ID = SUSER.DOCUMENT_ID')
        .order('SUSER.DOCUMENT_ID', false)
        .limit(15)
        .offset((page - 1) * 15)
        .toParam()
    )
}

exports.createScrap = async(userId, scrapGroupId, documentId) => {
    return await pool.executeQuery('createScrap',
        builder.insert()
        .into('SS_HST_USER_SCRAP')
        .setFields({
            'USER_ID': userId,
            'SCRAP_GROUP_ID': scrapGroupId,
            'DOCUMENT_ID': documentId
        })
        .toParam()
    )
}

exports.deleteScrap = async(userId, scrapGroupId, documentId) => {
    return await pool.executeQuery('deleteScrap',
        builder.delete()
        .from('SS_HST_USER_SCRAP')
        .where('USER_ID = ?', userId)
        .where('SCRAP_GROUP_ID = ?', scrapGroupId)
        .where('DOCUMENT_ID = ?', documentId)
        .toParam()
    )
}

const deleteScrapByGroup = async(userId, scrapGroupId) => {
    return await pool.executeQuery('deleteScrapByGroup',
        builder.delete()
        .from('SS_HST_USER_SCRAP')
        .where('USER_ID = ?', userId)
        .where('SCRAP_GROUP_ID = ?', scrapGroupId)
        .toParam()
    )
}

exports.createScrapGroup = async(userId, scrapGroupName) => {
    return await pool.executeQuery('createScrapGroup',
        builder.insert()
        .into('SS_MST_USER_SCRAP_GROUP')
        .setFields({
            'USER_ID': userId,
            'SCRAP_GROUP_ID': builder.str('SELECT COALESCE(MAX(SCRAP_GROUP_ID), 0) + 1 FROM SS_MST_USER_SCRAP_GROUP WHERE USER_ID = ?', userId),
            'SCRAP_GROUP_NAME': scrapGroupName
        })
        .returning('SCRAP_GROUP_ID', '"scrapGroupId"')
        .toParam())
}

exports.updateScrapGroup = async(userId, scrapGroupId, scrapGroupName) => {
    return await pool.executeQuery('updateScrapGroup',
        builder.update()
        .table('SS_MST_USER_SCRAP_GROUP')
        .set('SCRAP_GROUP_NAME', scrapGroupName)
        .where('USER_ID = ?', userId)
        .where('SCRAP_GROUP_ID = ?', scrapGroupId)
        .toParam()
    )
}

exports.deleteScrapGroup = async(userId, scrapGroupId) => {
    await deleteScrapByGroup(userId, scrapGroupId);
    return await pool.executeQuery('deleteScrapGroup',
        builder.delete()
        .from('SS_MST_USER_SCRAP_GROUP')
        .where('USER_ID = ?', userId)
        .where('SCRAP_GROUP_ID = ?', scrapGroupId)
        .toParam()
    )
}

exports.getScrapGroupByUserId = async(userId) => {
    return await pool.executeQuery('getScrapGroupByUserId',
        builder.select()
        .fields({
            'SCRAP_GROUP_ID': '"scrapGroupId"',
            'SCRAP_GROUP_NAME': '"scrapGroupName"'
        })
        .from('SS_MST_USER_SCRAP_GROUP')
        .where('USER_ID = ?', userId)
        .toParam()
    )
}

exports.getScrapGroup = async(userId, scrapGroupId) => {
    return await pool.executeQuery('getScrapGroups',
        builder.select()
        .fields({
            'SCRAP_GROUP_ID': '"scrapGroupId"',
            'SCRAP_GROUP_NAME': '"scrapGroupName"'
        })
        .from('SS_MST_USER_SCRAP_GROUP')
        .where('USER_ID = ?', userId)
        .where('SCRAP_GROUP_ID = ?', scrapGroupId)
        .toParam()
    )
}
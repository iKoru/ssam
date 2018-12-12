const pool = require('./db').instance,
    builder = require('./db').builder,
    { getYYYYMMDD } = require('../util');

exports.getSanctions = async (userId, boardId) => {
    let query = builder.select()
        .fields({
            'USER_ID':'"userId"',
            'BOARD_ID':'"boardId"',
            'SANCTION_CONTENTS':'"sanctionContents"',
            'SANCTION_DATE':'"sanctionDate"',
            'ADMIN_ID':'"adminId"'
        })
        .from('SS_HST_USER_SANCTION')
        .where('USER_ID = ?', userId)
    if(boardId){
        query.where('BOARD_ID = ?', boardId)
    }
    return await pool.executeQuery('getSanctions' + (boardId?'board':''),
        query.toParam()
    );
}

exports.createSanction = async (sanction) => {
    return await pool.executeQuery('createSanction',
        builder.insert().into('SS_HST_USER_SANCTION')
            .setFields({
                'USER_ID':sanction.userId,
                'ADMIN_ID':sanction.adminId,
                'BOARD_ID':sanction.boardId,
                'SANCTION_DATE':getYYYYMMDD(),
                'SANCTION_CONTENTS':sanction.sanctionContents
            })
            .toParam()
    )
}

const pool = require('./db').instance,
    builder = require('./db').builder;
const util = require('../util');

exports.createUserAuth = async(userId, authKey) => {
    let result = await pool.executeQuery('createAuthKey',
        builder.insert()
        .into('SS_HST_USER_AUTH')
        .setFields({
            'USER_ID': userId,
            'AUTH_KEY': authKey,
            'SEND_DATETIME': util.getYYYYMMDDHH24MISS(),
        })
        .toParam()
    );
    return result;
}

exports.getUserAuth = async(userId, status, page = 1) => {
    let query = builder.select()
        .fields({
            'USER_ID': '"userId"',
            'AUTH_KEY': '"authKey"',
            'SEND_DATETIME': '"sendDateTime"'
        })
        .from('SS_HST_USER_AUTH')
        .where('USER_ID = ?', userId)
    if (status) {
        query.where('STATUS = ?', status)
            .where('SEND_DATETIME > ?', util.getYYYYMMDDHH24MISS(moment(-1, 'months')))
    }
    return await pool.executeQuery('getUserAuth',
        query.limit(10).offset((page - 1) * 10)
        .order('SEND_DATETIME', false)
        .toParam()
    );
}

exports.updateUserAuth = async(auth) => {
    if (!auth.userId || !auth.authKey) {
        return 0;
    }
    let query = builder.update()
        .table('SS_HST_USER_AUTH')
    if (auth.sendDateTime) {
        query.set('SEND_DATETIME', util.getYYYYMMDDHH24MISS())
    }
    if (auth.status) {
        query.set('STATUS', auth.status)
    }
    return await pool.executeQuery('updateUserAuth' + (auth.sendDateTime ? 'time' : '') + (auth.status || ''),
        query.where('USER_ID = ?', auth.userId)
        .where('AUTH_KEY = ?', auth.authKey)
        .toParam()
    )
}
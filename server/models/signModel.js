const pool = require('./db').instance;
const builder = require('squel').useFlavour('postgres');
const util = require('../util');

exports.createSigninLog = async(userId, ip, isSuccess) => {
    const result = await pool.executeQuery('createSigninLog',
        builder.insert()
            .into('SS_HST_USER_SIGNIN')
            .set('USER_ID', userId)
            .set('IP', ip)
            .set('SIGNIN_TIMESTAMP', builder.rstr('current_timestamp'), {dontQuote: true})
            .set('IS_SUCCESS', isSuccess)
            .toParam()
    );
    if(result > 0){
        result = await pool.executeQuery('updateUserSigninDate',
            builder.update()
                .table('SS_MST_USER')
                .set('LAST_SIGNIN_DATE', util.getYYYYMMDD())
                .where('USER_ID = ?', userId)
        );
    }
    return result;
}

exports.getSigninLog = async(userId, from, to) => {
    return await pool.executeQuery('getSigninLog',
        builder.select()
            .from('SS_HST_USER_SIGNIN')
            .where('USER_ID = ?', userId)
            .where('SIGNIN_TIMESTAMP BETWEEN TO_TIMESTAMP(? || \'000000\', \'YYYYMMDDHH24MISS\') AND TO_TIMESTAMP(? || \'235959\', \'YYYYMMDDHH24MISS\')', from, to)
            .toParam()
    );
}
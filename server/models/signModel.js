const pool = require('./db').instance;
const builder = require('squel').useFlavour('postgres');

exports.createSigninLog = async(userId, ip, isSuccess) => {
    await pool.executeQuery(
        builder.insert()
            .into('SS_HST_USER_SIGNIN')
            .set('USER_ID', userId)
            .set('IP', ip)
            .set('SIGNIN_TIMESTAMP', 'current_timestamp', {dontQuote: true})
            .set('IS_SUCCESS', isSuccess)
            .toParam()
    );
}

exports.getSigninLog = async(userId, from, to) => {
    return await pool.executeQuery(
        builder.select()
            .from('SS_HST_USER_SIGNIN')
            .where('USER_ID = ?', userId)
            .where('SIGNIN_TIMESTAMP BETWEEN TO_TIMESTAMP(? || \'000000\', \'YYYYMMDDHH24MISS\') AND TO_TIMESTAMP(? || \'235959\', \'YYYYMMDDHH24MISS\')', from, to)
            .toParam()
    );
}
const pool = require('./db').instance;

exports.createSigninLog = async(userId, ip, isSuccess) => {
    await pool.executeQuery('INSERT INTO SS_HST_USER_SIGNIN(USER_ID, SIGNIN_TIMESTAMP, IP, IS_SUCCESS) VALUES($1, current_timestamp, $2, $3)', [userId, ip, isSuccess]);
}

exports.getSigninLog = async(userId, from, to) => {
    return await pool.executeQuery('SELECT * FROM SS_HST_USER_SIGNIN WHERE USER_ID = $1 AND SIGNIN_TIMESTAMP BETWEEN TO_TIMESTAMP($2 || \'000000\', \'YYYYMMDDHH24MISS\') AND TO_TIMESTAMP($3 || \'235959\', \'YYYYMMDDHH24MISS\')', [userId, from, to]);
}
const pool = require('./db').instance;
const builder = require('squel').useFlavour('postgres');

exports.checkUserId = async(userId) => {
    return await pool.executeQuery(
        builder.select()
            .field('COUNT(*)', 'count')
            .from('SS_MST_USER')
            .where('USER_ID = ?', userId)
            .limit(1)
            .toParam()
    );
}

exports.checkNickName = async(userId, nickName) => {
    return await pool.executeQuery(
        builder.select()
            .field('COUNT(*)', 'count')
            .from('SS_MST_USER')
            .where('LOUNGE_NICKNAME = ? OR TOPIC_NICKNAME = ?', nickName, nickName)
            .where('USER_ID <> ?', userId)
            .limit(1)
            .toParam()
        //'SELECT COUNT(*) count FROM SS_MST_USER WHERE (LOUNGE_NICKNAME = $1 OR TOPIC_NICKNAME = $1) AND USER_ID <> $2 LIMIT 1', [nickName, userId]
    );
}

exports.checkEmail = async(email) => {
    return await pool.executeQuery(
        builder.select()
            .field('COUNT(*)', 'count')
            .from('SS_MST_USER')
            .where('EMAIL = ?', email)
            .limit(1)
            .toParam()
        //'SELECT COUNT(*) count FROM SS_MST_USER WHERE EMAIL = $1 LIMIT 1', [email]
    );
}

exports.createUser = async(user) => {
    return await pool.executeQuery(
        builder.insert()
            .into('SS_MST_USER')
            .setFields(user)
            .toParam()
    // `INSERT INTO SS_MST_USER
    // (USER_ID, LOUNGE_NICKNAME, TOPIC_NICKNAME, EMAIL, PASSWORD, IS_ADMIN, 
    
    // `)
    );
}

exports.updateUser = async(user) => {

}

exports.deleteUser = async(userId) => {
    return await pool.executeQuery(
        builder.delete()
            .from('SS_MST_USER')
            .where('USER_ID', userId)
            .toParam()
    );
}

exports.getUser = async(userId) => {

}

exports.resetPassword = async(userId, email) => {

}

exports.getUsers = async(userId, nickName, email, groupId, status, sortTarget = "userId", sortType = "desc", page = 1) => {

}

exports.getProfile = async(nickName) => {

}
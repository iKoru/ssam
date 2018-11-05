const pool = require('./db');

exports.checkUserId = async(userId) => {
    return await pool.executeQuery('SELECT COUNT(*) count FROM SS_MST_USER WHERE USER_ID = $1 LIMIT 1', [userId]);
}

exports.checkNickName = async(userId, nickName) => {
    return await pool.executeQuery('SELECT COUNT(*) count FROM SS_MST_USER WHERE (LOUNGE_NICKNAME = $1 OR TOPIC_NICKNAME = $1) AND USER_ID <> $2 LIMIT 1', [nickName, userId]);
}

exports.checkEmail = async(email) => {
    return await pool.executeQuery('SELECT COUNT(*) count FROM SS_MST_USER WHERE EMAIL = $1 LIMIT 1', [email]);
}

exports.createUser = async(user) => {

}

exports.updateUser = async(user) => {

}

exports.deleteUser = async(user) => {

}

exports.getUser = async(userId) => {

}

exports.resetPassword = async(userId, email) => {

}

exports.getUsers = async(userId, nickName, email, groupId, status, sortTarget = "userId", sortType = "desc", page = 1) => {

}

exports.getProfile = async(nickName) => {

}
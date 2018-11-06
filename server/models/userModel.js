const pool = require('./db').instance;
const builder = require('squel').useFlavour('postgres');
const util = require('../util');

exports.checkUserId = async(userId) => {
    return await pool.executeQuery('checkUserId',
        builder.select()
            .field('COUNT(*)', 'count')
            .from('SS_MST_USER')
            .where('USER_ID = ?', userId)
            .limit(1)
            .toParam()
    );
}

exports.checkNickName = async(userId, nickName) => {
    return await pool.executeQuery('checkNickName',
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
    return await pool.executeQuery('checkEmail',
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
    const nickName = util.partialUUID() + util.partialUUID();
    return await pool.executeQuery('createUser',
        builder.insert()
            .into('SS_MST_USER')
            .setFields({
                USER_ID:user.userId,
                EMAIL:user.email,
                LOUNGE_NICKNAME:nickName,
                TOPIC_NICKNAME:nickName,
                PASSWORD:user.password,
                INVITE_CODE:util.partialUUID(),
                INVITER:user.inviter
            })
            .toParam()
    // `INSERT INTO SS_MST_USER
    // (USER_ID, LOUNGE_NICKNAME, TOPIC_NICKNAME, EMAIL, PASSWORD, IS_ADMIN, 
    
    // `)
    );
}

exports.updateUser = async(user) => {
    const userId = user.userId;
    delete user.userId;
    return await pool.executeQuery('updateUser',
        builder.update()
            .table('SS_MST_USER')
            .setFields(user)
            .where('USER_ID = ?', userId)
            .toParam()
    );
}

exports.deleteUser = async(userId) => {
    return await pool.executeQuery('deleteUser',
        builder.delete()
            .from('SS_MST_USER')
            .where('USER_ID = ?', userId)
            .toParam()
    );
}

exports.getUser = async(userId) => {
    return await pool.executeQuery('getUser',
        builder.select()
            .from('SS_MST_USER')
            .where('USER_ID = ?', userId)
            .toParam()
    );
}

exports.resetPassword = async(userId, password) => {
    return await pool.executeQuery('resetPassword',
        builder.update()
            .table('SS_MST_USER')
            .set('PASSWORD', password)
            .where('USER_ID = ?')
            .toParam()
    );
}

exports.getUsers = async(userId, nickName, email, groupId, status, sortTarget = "userId", isAscending = true, page = 1) => {
    return await pool.executeQuery('getUsers',
        builder.select()
            .from('SS_MST_USER')
            .where(userId?builder.str('USER_ID = ?', userId):null)
            .where(nickName?builder.str('LOUNGE_NICKNAME = ? OR TOPIC_NICKNAME = ?', nickName, nickName):null)
            .where(email?builder.str('EMAIL = ?', email):null)
            .where(groupId?builder.str('USER_ID IN ?', 
                builder.select()
                    .distinct('USER_ID')
                    .from('SS_MST_USER_GROUP')
                    .where('GROUP_ID = ?', groupId)
                    .where(`EXPIRE_DATE > '${util.getTodayYYYYMMDD()}'`)
            ):null)
            .where(status?builder.str('STATUS = ?', status):null)
            .order(sortTarget, isAscending)
            .limit(15)
            .offset((page-1)*15)
            .toParam()
    );
}

exports.getProfile = async(nickName) => {
    return await pool.executeQuery('getProfile',
        builder.select()
            .fields(['LOUNGE_NICKNAME:nickName', 'PICTURE_PATH:picturePath', 'IS_OPEN_INFO:isOpenInfo'])
            .field(builder.str('MAX(?)', builder.case().when('GROUP.GROUP_TYPE = \'M\'').then('GROUP.GROUP_NAME').else(builder.rstr('NULL'))), 'major')
            .field(builder.str('MAX(?)', builder.case().when('GROUP.GROUP_TYPE = \'G\'').then('GROUP.GROUP_NAME').else(builder.rstr('NULL'))), 'grade')
            .field(builder.str('MAX(?)', builder.case().when('GROUP.GROUP_TYPE = \'R\'').then('GROUP.GROUP_NAME').else(builder.rstr('NULL'))), 'region')
            .from( builder.select().fields(['USER_ID', 'LOUNGE_NICKNAME', 'PICTURE_PATH', 'IS_OPEN_INFO']).from('SS_MST_USER').where('LOUNGE_NICKNAME = ?', nickName), 'USER')
            .left_join(
                'SS_MST_USER_GROUP', 'USERGROUP', 'USER.USER_ID = USERGROUP.USER_ID')
            .join( builder.select().fields(['GROUP_ID', 'GROUP_TYPE', 'GROUP_NAME']).from('SS_MST_GROUP').where('GROUP_TYPE IN ?', ['M', 'G', 'R']), 'GROUP')//major, grade, region
            .where('USERGROUP.GROUP_ID = GROUP.GROUP_ID')
            .limit(1)
    );
}
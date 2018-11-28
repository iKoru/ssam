const pool = require('./db').instance,
    builder = require('./db').builder;
const util = require('../util'),
    logger = require('../logger');
const groupModel = require('./groupModel');

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
    );
}

exports.createUser = async(user) => {
    let result = await pool.executeQuery('createUser',
        builder.insert()
        .into('SS_MST_USER')
        .setFields({
            USER_ID: user.userId,
            EMAIL: user.email,
            LOUNGE_NICKNAME: user.nickName,
            TOPIC_NICKNAME: user.nickName,
            PASSWORD: user.password,
            INVITE_CODE: util.partialUUID(),
            INVITER: user.inviter
        })
        .toParam()
    );
    if (result === 1 && user.inviter) {
        await pool.executeQuery('updateInviter',
            builder.update()
            .table('SS_MST_USER')
            .set('INVITED_COUNT', builder.str('INVITED_COUNT + 1'))
            .where('INVITE_CODE = ?', user.inviter)
            .toParam()
        )
    }
    return result;
}

exports.updateUserInfo = async(user) => {
    try {
        if (!user.userId) {
            return 0;
        }
        let query = builder.update().table('SS_MST_USER')
        if (user.loungeNickName) {
            query.set('LOUNGE_NICKNAME', user.loungeNickName)
                .set('LOUNGE_NICKNAME_MODIFIED_DATE', util.getYYYYMMDD())
        }
        if (user.topicNickName) {
            query.set('TOPIC_NICKNAME', user.topicNickName)
                .set('TOPIC_NICKNAME_MODIFIED_DATE', util.getYYYYMMDD())
        }
        if (user.picturePath) {
            query.set('PICTURE_PATH', user.picturePath)
        }
        if (typeof user.isOpenInfo === 'boolean') {
            query.set('IS_OPEN_INFO', user.isOpenInfo)
        }
        if (user.grade || user.major || user.region) {
            query.set('INFO_MODIFIED_DATE', util.getYYYYMMDD())
        }
        if (user.memo) {
            query.set('MEMO', user.memo)
        }
        if (user.email) {
            query.set('EMAIL', user.email)
        }
        if (user.status) {
            query.set('STATUS', user.status)
        }
        let result = await pool.executeQuery(null,
            query
            .where('USER_ID = ?', user.userId)
            .toParam()
        );
        if (result > 0) {
            if (user.grade) {
                await pool.executeQuery('deleteUserGrade',
                    builder.delete()
                    .from('SS_MST_USER_GROUP')
                    .where('USER_ID = ?', user.userId)
                    .where('GROUP_ID IN ?', builder.select().field('GROUP_ID').from('SS_MST_GROUP').where('GROUP_TYPE = \'G\''))
                    .toParam()
                );
                if (user.grade !== '') {
                    result += await groupModel.createUserGroup(user.userId, user.grade);
                }
            }
            if (user.major) {
                await pool.executeQuery('deleteUserMajor',
                    builder.delete()
                    .from('SS_MST_USER_GROUP')
                    .where('USER_ID = ?', user.userId)
                    .where('GROUP_ID IN ?', builder.select().field('GROUP_ID').from('SS_MST_GROUP').where('GROUP_TYPE = \'M\''))
                    .toParam()
                );
                if (user.major !== '') {
                    result += await groupModel.createUserGroup(user.userId, user.major);
                }
            }
            if (user.region) {
                await pool.executeQuery('deleteUserRegion',
                    builder.delete()
                    .from('SS_MST_USER_GROUP')
                    .where('USER_ID = ?', user.userId)
                    .where('GROUP_ID IN ?', builder.select().field('GROUP_ID').from('SS_MST_GROUP').where('GROUP_TYPE = \'R\''))
                    .toParam()
                );
                if (user.region !== '') {
                    result += await groupModel.createUserGroup(user.userId, user.region);
                }
            }
        }
        return result;
    } catch (e) {
        logger.error('update user error!', user, e);
    }
}

exports.updateUserPassword = async(user) => {
    return await pool.executeQuery(null,
        builder.update()
        .table('SS_MST_USER')
        .setFields({
            'PASSWORD': user.password || builder.rstr('PASSWORD'),
            'PASSWORD_CHANGE_DATE': user.password ? util.getYYYYMMDD() : builder.rstr('PASSWORD_CHANGE_DATE')
        })
        .where('USER_ID = ?', user.userId)
        .toParam()
    );
}

exports.updateUserAdmin = async(user) => {
    return await pool.executeQuery(null,
        builder.update()
        .table('SS_MST_USER')
        .set('IS_ADMIN', user.isAdmin === undefined ? builder.rstr('IS_ADMIN') : user.isAdmin)
        .where('USER_ID = ?', user.userId)
        .toParam()
    );
}

exports.updateUserAuth = async(userId) => {
    return await pool.executeQuery('updateUserAuth',
        builder.update()
        .table('SS_MST_USER')
        .set('EMAIL_VERIFIED_DATE', util.getYYYYMMDD())
        .where('USER_ID = ?', userId)
        .toParam()
    )
}
exports.deleteUser = async(userId) => {
    let result = await pool.executeQuery('deleteUser',
        builder.delete()
        .from('SS_MST_USER')
        .where('USER_ID = ?', userId)
        .toParam()
    );
    if (result > 0) {
        await pool.executeQuery('deleteUserGroupByUserId',
            builder.delete()
            .from('SS_MST_USER_GROUP')
            .where('USER_ID = ?', userId)
            .toParam()
        )
        await pool.executeQuery('deleteUserScrapGroupByUserId',
            builder.delete()
            .from('SS_MST_USER_SCRAP_GROUP')
            .where('USER_ID = ?', userId)
            .toParam()
        )
        await pool.executeQuery('deleteUserScrapByUserId',
            builder.delete()
            .from('SS_HST_USER_SCRAP')
            .where('USER_ID = ?', userId)
            .toParam()
        )
        return result;
    }
}

exports.getUser = async(userId) => {
    return await pool.executeQuery('getUser3',
        builder.select()
        .fields({
            'USER_ID': '"userId"',
            'LOUNGE_NICKNAME': '"loungeNickName"',
            'TOPIC_NICKNAME': '"topicNickName"',
            'LOUNGE_NICKNAME_MODIFIED_DATE': '"loungeNickNameModifiedDate"',
            'TOPIC_NICKNAME_MODIFIED_DATE': '"topicNickNameModifiedDate"',
            'EMAIL': '"email"',
            'IS_ADMIN': '"isAdmin"',
            'EMAIL_VERIFIED_DATE': '"emailVerifiedDate"',
            'PICTURE_PATH': '"picturePath"',
            'IS_OPEN_INFO': '"isOpenInfo"',
            'STATUS': '"status"',
            'SIGNUP_DATE': '"signupDate"',
            'LAST_SIGNIN_DATE': '"lastSigninDate"',
            'INVITER': '"inviter"',
            'INVITED_COUNT': '"invitedCount"',
            'INVITE_CODE': '"inviteCode"',
            'PASSWORD': '"password"',
            'PASSWORD_CHANGE_DATE': '"passwordChangeDate"',
            'MEMO': '"memo"'
        })
        .from('SS_MST_USER')
        .where('USER_ID = ?', userId)
        .toParam()
    );
}

exports.getUsers = async(userId, nickName, email, groupId, status, sortTarget = "USER_ID", isAscending = true, page = 1) => {
    let query = builder.select()
        .fields({
            'USER_ID': '"userId"',
            'LOUNGE_NICKNAME': '"loungeNickName"',
            'TOPIC_NICKNAME': '"topicNickName"',
            'IS_ADMIN': '"isAdmin"',
            'EMAIL_VERIFIED_DATE': '"emailVerifiedDate"',
            'PICTURE_PATH': '"picturePath"',
            'IS_OPEN_INFO': '"isOpenInfo"',
            'STATUS': '"status"',
            'SIGNUP_DATE': '"signupDate"',
            'LAST_SIGNIN_DATE': '"lastSigninDate"',
            'INVITER': '"inviter"',
            'INVITED_COUNT': '"invitedCount"',
            'INVITE_CODE': '"inviteCode"'
        })
        .from('SS_MST_USER')
        .where(userId ? builder.str('USER_ID = ?', userId) : '')
        .where(nickName ? builder.str('LOUNGE_NICKNAME = ? OR TOPIC_NICKNAME = ?', nickName, nickName) : '')
        .where(email ? builder.str('EMAIL = ?', email) : '')
        .where(groupId ? builder.str('USER_ID IN ?',
            builder.select()
            .field('USER_ID')
            .distinct()
            .from('SS_MST_USER_GROUP')
            .where('GROUP_ID = ?', groupId)
            .where(`EXPIRE_DATE > '${util.getYYYYMMDD()}'`)
        ) : '')
        .where(status ? builder.str('STATUS = ?', status) : '')
        .order(sortTarget, isAscending);
    if(page === null || page > 0){
        query
        .limit(15)
        .offset(((page ? page : 1)- 1) * 15)
    }
    return await pool.executeQuery('getUsers' + (page? 'page':'all'),
        query
        .toParam()
    );
}

exports.getProfile = async(nickName) => {
    if (!nickName || nickName.length < 1) {
        return {};
    }
    const user = await pool.executeQuery('getProfile',
        builder.select()
        .fields({
            'USER_ID': '"userId"',
            'LOUNGE_NICKNAME': '"nickName"',
            'PICTURE_PATH': '"picturePath"',
            'IS_OPEN_INFO': '"isOpenInfo"'
        })
        .from('SS_MST_USER')
        .where('LOUNGE_NICKNAME = ?', nickName)
        .limit(1)
        .toParam()
    );
    if (Array.isArray(user) && user.length > 0) {
        if (user[0].isOpenInfo) {
            const groups = await pool.executeQuery('getProfileGroup',
                builder.select()
                .field(builder.str('MAX(?)', builder.case().when('MGROUP.GROUP_TYPE = \'M\'').then('MGROUP.GROUP_NAME').else(builder.rstr('NULL'))), 'major')
                .field(builder.str('MAX(?)', builder.case().when('MGROUP.GROUP_TYPE = \'G\'').then('MGROUP.GROUP_NAME').else(builder.rstr('NULL'))), 'grade')
                .field(builder.str('MAX(?)', builder.case().when('MGROUP.GROUP_TYPE = \'R\'').then('MGROUP.GROUP_NAME').else(builder.rstr('NULL'))), 'region')
                .from(builder.select().from('SS_MST_USER_GROUP').where('USER_ID = ?', user[0].userId), 'USERGROUP')
                .left_join(builder.select().fields(['GROUP_ID', 'GROUP_TYPE', 'GROUP_NAME']).from('SS_MST_GROUP').where('GROUP_TYPE IN (\'M\', \'G\', \'R\')'), 'MGROUP', 'USERGROUP.GROUP_ID = MGROUP.GROUP_ID') //major, grade, region
                .toParam()
            );
            if (Array.isArray(groups) && groups.length > 0) {
                return {...user[0], ...groups[0] };
            }
        }
        return {...user[0] };
    } else if (Array.isArray(user)) {
        return {};
    } else {
        return user;
    }
}

exports.getUserIdByNickName = async(nickName, boardType) => {
    return await pool.executeQuery('getUserIdByNickName',
        builder.select()
        .field('USER_ID', '"userId"')
        .from('SS_MST_USER')
        .where(`${(boardType === 'T' ? 'TOPIC_NICKNAME' : 'LOUNGE_NICKNAME')} = ?`, nickName)
        .toParam()
    );
}

exports.updateUserInfoDate = async(userId, infoModifiedDate, loungeNickNameModifiedDate, topicNickNameModifiedDate) => {
    return await pool.executeQuery(null,
        builder.update()
        .table('SS_MST_USER')
        .setFields({
            'INFO_MODIFIED_DATE': infoModifiedDate === undefined ? builder.rstr('INFO_MODIFIED_DATE') : infoModifiedDate,
            'LOUNGE_NICKNAME_MODIFIED_DATE': loungeNickNameModifiedDate === undefined ? builder.rstr('LOUNGE_NICKNAME_MODIFIED_DATE') : loungeNickNameModifiedDate,
            'TOPIC_NICKNAME_MODIFIED_DATE': topicNickNameModifiedDate === undefined ? builder.rstr('TOPIC_NICKNAME_MODIFIED_DATE') : topicNickNameModifiedDate
        })
        .where('USER_ID = ?', userId)
        .toParam()
    )
}

exports.updateUserPicture = async(userId, uuid, originalFileName, fileType, filePath) => {
    return await pool.executeQuery('updateUserPicture',
        builder.update()
        .table('SS_MST_USER')
        .set('PICTURE_PATH', filePath)
        .where('USER_ID = ?', userId)
        .toParam()
    )
}
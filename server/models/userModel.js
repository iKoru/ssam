const pool = require('./db').instance;
const builder = require('squel').useFlavour('postgres');
const util = require('../util'), logger = require('../logger');
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
    const nickName = util.partialUUID() + util.partialUUID();
    let result = await pool.executeQuery('createUser',
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
    );
    if(result === 1 && user.inviter){
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
    try{
        let result = await pool.executeQuery('updateUserInfo',
            builder.update()
                .table('SS_MST_USER')
                .set('LOUNGE_NICKNAME', user.loungeNickName || builder.rstr('LOUNGE_NICKNAME'))
                .set('TOPIC_NICKNAME', user.topicNickName || builder.rstr('TOPIC_NICKNAME'))
                .set('PICTURE_PATH', user.picturePath || builder.rstr('PICTURE_PATH'))
                .set('IS_OPEN_INFO', user.isOpenInfo === undefined? builder.rstr('IS_OPEN_INFO') : user.isOpenInfo)
                .set('INFO_MODIFIED_DATE', (user.loungeNickName || user.topicNickName || user.picturePath || (user.isOpenInfo !== undefined)) ? util.getYYYYMMDD() : builder.rstr('INFO_MODIFIED_DATE'))
                .where('USER_ID = ?', user.userId)
                .toParam()
        );
        if(result > 0){
            if(user.grade){
                await pool.executeQuery('deleteUserGrade',
                    builder.delete()
                        .from('SS_MST_USER_GROUP')
                        .where('USER_ID = ?', user.userId)
                        .where('GROUP_ID IN ?', builder.select().field('GROUP_ID').from('SS_MST_GROUP').where('GROUP_TYPE = \'G\''))
                );
                const grade = await groupModel.getGroup(user.grade)[0];
                if(grade){
                    let expireDate;
                    if(grade.expirePeriod > 0){
                        expireDate = new Date();
                        expireDate.setDate(expireDate.getDate() + grade.expirePeriod);
                    }else{
                        expireDate = '99991231';
                    }
                    await pool.executeQuery('insertUserGrade',
                        builder.insert()
                            .into('SS_MST_USER_GROUP')
                            .set('USER_ID', user.userId)
                            .set('GROUP_ID', user.grade)
                            .set('EXPIRE_DATE', expireDate)
                    );
                }
            }
            if(user.major){
                await pool.executeQuery('deleteUserMajor',
                    builder.delete()
                        .from('SS_MST_USER_GROUP')
                        .where('USER_ID = ?', user.userId)
                        .where('GROUP_ID IN ?', builder.select().field('GROUP_ID').from('SS_MST_GROUP').where('GROUP_TYPE = \'M\''))
                );
                const major = await groupModel.getGroup(user.major)[0];
                if(major){
                    let expireDate;
                    if(major.expirePeriod > 0){
                        expireDate = new Date();
                        expireDate.setDate(expireDate.getDate() + major.expirePeriod);
                    }else{
                        expireDate = '99991231';
                    }
                    await pool.executeQuery('insertUserMajor',
                        builder.insert()
                            .into('SS_MST_USER_GROUP')
                            .set('USER_ID', user.userId)
                            .set('GROUP_ID', user.major)
                            .set('EXPIRE_DATE', expireDate)
                    );
                }
            }
            if(user.region){
                await pool.executeQuery('deleteUserRegion',
                    builder.delete()
                        .from('SS_MST_USER_GROUP')
                        .where('USER_ID = ?', user.userId)
                        .where('GROUP_ID IN ?', builder.select().field('GROUP_ID').from('SS_MST_GROUP').where('GROUP_TYPE = \'R\''))
                );
                const region = await groupModel.getGroup(user.region)[0];
                if(region){
                    let expireDate;
                    if(region.expirePeriod > 0){
                        expireDate = new Date();
                        expireDate.setDate(expireDate.getDate() + region.expirePeriod);
                    }else{
                        expireDate = '99991231';
                    }
                    await pool.executeQuery('insertUserMajor',
                        builder.insert()
                            .into('SS_MST_USER_GROUP')
                            .set('USER_ID', user.userId)
                            .set('GROUP_ID', user.region)
                            .set('EXPIRE_DATE', expireDate)
                    );
                }
            }
        }
    } catch(e){
        logger.error('update user error!', user, e);
    }
}

exports.updateUserPassword = async(user) => {
    return await pool.executeQuery('updateUserPassword',
        builder.update()
            .table('SS_MST_USER')
            .set('PASSWORD', user.password || builder.rstr('PASSWORD'))
            .set('PASSWORD_CHANGE_DATE', user.password ? util.getYYYYMMDD() : builder.rstr('PASSWORD_CHANGE_DATE'))
            .where('USER_ID = ?', user.userId)
            .toParam()
    );
}

exports.updateUserAdmin = async(user) => {
    return await pool.executeQuery('updateUserAdmin',
        builder.update()
            .table('SS_MST_USER')
            .set('IS_ADMIN', user.isAdmin === undefined?builder.rstr('IS_ADMIN'):user.isAdmin)
            .where('USER_ID = ?', user.userId)
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
                    .where(`EXPIRE_DATE > '${util.getYYYYMMDD()}'`)
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
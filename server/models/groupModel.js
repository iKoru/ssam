const pool = require('./db').instance,
    builder = require('./db').builder;
const cache = require('../cache'), util = require('../util'), {groupTypeDomain} = require('../constants'), 
    {authGrantedGroupId, authExpiredGroupId} = require('../../config');

const getGroup = async (groupId, groupType) => {
    if (!groupId) {
        return [];
    }
    let query = builder.select()
        .fields({
            'GROUP_ID': '"groupId"',
            'GROUP_NAME': '"groupName"',
            'GROUP_DESCRIPTION': '"groupDescription"',
            'GROUP_ICON_PATH': '"groupIconPath"',
            'GROUP_TYPE': '"groupType"',
            'PARENT_GROUP_ID': '"parentGroupId"',
            'IS_OPEN_TO_USERS': '"isOpenToUsers"',
            'EXPIRE_PERIOD': '"expirePeriod"'
        })
        .from('SS_MST_GROUP')
        .where('GROUP_ID = ?', groupId)
    if (groupType) {
        query.where('GROUP_TYPE IN ?', groupType)
    }
    return await pool.executeQuery('getGroup' + (groupType ? groupType.length : ''),
        query
            .limit(1)
            .toParam()
    );
}

exports.getGroup = getGroup;

exports.getGroups = async (isAdmin, groupType = groupTypeDomain, page) => {
    let query = builder.select()
    if (isAdmin) {
        query.fields({
            'GROUP_ID': '"groupId"',
            'GROUP_NAME': '"groupName"',
            'GROUP_DESCRIPTION': '"groupDescription"',
            'GROUP_ICON_PATH': '"groupIconPath"',
            'GROUP_TYPE': '"groupType"',
            'PARENT_GROUP_ID': '"parentGroupId"',
            'IS_OPEN_TO_USERS': '"isOpenToUsers"',
            'EXPIRE_PERIOD': '"expirePeriod"'
        })
            .from('SS_MST_GROUP')
            .where('GROUP_TYPE IN ?', groupType)
    } else {
        query.fields({
            'GROUP_ID': '"groupId"',
            'GROUP_NAME': '"groupName"',
            'GROUP_DESCRIPTION': '"groupDescription"',
            'GROUP_ICON_PATH': '"groupIconPath"',
            'GROUP_TYPE': '"groupType"',
            'PARENT_GROUP_ID': '"parentGroupId"'
        })
            .from('SS_MST_GROUP')
            .where('GROUP_TYPE IN ?', groupType)
            .where('IS_OPEN_TO_USERS = true')
    }

    if (page) {
        query.limit(30)
            .offset((page - 1) * 30)
    }
    query.order('ORDER_NUMBER')
    return isAdmin ?
        await pool.executeQuery('getGroupsForAdmin' + (groupType ? groupType.length : '') + (page >= 0 ? '' : 'all'),
            query
                .toParam()
        ) :
        await pool.executeQuery('getGroups' + (groupType ? groupType.length : '') + (page >= 0 ? '' : 'all'),
            query
                .toParam()
        );
};

exports.getGroupsByParentGroupId = async (parentGroupId) => {
    return await pool.executeQuery('getGroupsByParentGroupId',
        builder.select()
            .fields({
                'GROUP_ID': '"groupId"',
                'GROUP_NAME': '"groupName"',
                'GROUP_DESCRIPTION': '"groupDescription"',
                'GROUP_ICON_PATH': '"groupIconPath"',
                'GROUP_TYPE': '"groupType"',
                'IS_OPEN_TO_USERS': '"isOpenToUsers"',
                'EXPIRE_PERIOD': '"expirePeriod"'
            })
            .from('SS_MST_GROUP')
            .where('PARENT_GROUP_ID = ?', parentGroupId)
            .toParam()
    )
}

exports.createGroup = async (group) => {
    return await pool.executeQuery('createGroup',
        builder.insert()
            .into('SS_MST_GROUP')
            .setFields({
                'GROUP_ID': builder.rstr('CAST(nextval(\'SEQ_SS_MST_GROUP\') AS INTEGER)'),
                'GROUP_NAME': group.groupName,
                'GROUP_DESCRIPTION': group.groupDescription,
                'GROUP_ICON_PATH': group.groupIconPath,
                'GROUP_TYPE': group.groupType,
                'PARENT_GROUP_ID': group.parentGroupId,
                'EXPIRE_PERIOD': group.expirePeriod,
                'ORDER_NUMBER': builder.str('SELECT COALESCE(MAX(ORDER_NUMBER), 0) + 1 FROM SS_MST_GROUP'),
                'IS_OPEN_TO_USERS': group.isOpenToUsers
            })
            .returning('GROUP_ID', '"groupId"')
            .toParam()
    );
}

exports.updateGroup = async (group) => {
    return await pool.executeQuery(null,
        builder.update()
            .table('SS_MST_GROUP')
            .setFields({
                'GROUP_NAME': group.groupName || builder.rstr('GROUP_NAME'),
                'GROUP_DESCRIPTION': group.description || builder.rstr('GROUP_DESCRIPTION'),
                'GROUP_TYPE': group.groupType || builder.rstr('GROUP_TYPE'),
                'PARENT_GROUP_ID': group.parentGroupId !== undefined ? group.parentGroupId : builder.rstr('PARENT_GROUP_ID'),
                'ORDER_NUMBER': util.isNumeric(group.orderNumber) ? group.orderNumber : builder.rstr('ORDER_NUMBER'),
                'IS_OPEN_TO_USERS': group.isOpenToUsers !== undefined ? group.isOpenToUsers : builder.rstr('IS_OPEN_TO_USERS'),
                'EXPIRE_PERIOD': util.isNumeric(group.expirePeriod) ? group.expirePeriod : builder.rstr('EXPIRE_PERIOD')
            })
            .where('GROUP_ID = ?', group.groupId)
            .toParam()
    );
}

exports.deleteGroup = async (groupId) => {
    return await pool.executeQuery('deleteGroup',
        builder.delete()
            .from('SS_MST_GROUP')
            .where('GROUP_ID = ?', groupId)
            .toParam()
    );
}

const createUserGroup = async (userId, groupId) => {
    let group = await getGroup(groupId);
    if (group.length === 0) {
        return 0;
    }

    group = group[0];
    let expireDate;
    if (group.expirePeriod > 0) {
        expireDate = util.moment().add(group.expirePeriod, 'days').format('YMMDD');
    } else {
        expireDate = '99991231';
    }
    let cachedData = await pool.executeQuery('createUserGroup',
        builder.insert()
            .into('SS_MST_USER_GROUP')
            .setFields({
                'USER_ID': userId,
                'GROUP_ID': group.groupId,
                'EXPIRE_DATE': expireDate
            })
            .toParam()
    );
    if (cachedData === 1) {
        cache.delAsync('[getUserGroup]@' + util.getYYYYMMDD() + userId);
        cache.delAsync('[checkUserAuth]@'+userId);
    }
    return cachedData;
}
exports.createUserGroup = createUserGroup

const deleteUserGroup = async (userId, groupId) => {
    let result = await pool.executeQuery('deleteUserGroup',
        builder.delete()
            .from('SS_MST_USER_GROUP')
            .where('USER_ID = ?', userId)
            .where('GROUP_ID = ?', groupId)
            .toParam()
    );
    if (result === 1) {
        cache.delAsync('[getUserGroup]@' + util.getYYYYMMDD() + userId);
        cache.delAsync('[checkUserAuth]@'+userId);
    }
    return result;
}
exports.deleteUserGroup = deleteUserGroup

exports.deleteExpiredUserGroup = async () => {
    const yesterday = util.getYYYYMMDD(util.moment().add(-1, 'days'));
    let result = await pool.executeQuery('getExpiredUserGroup',
        builder.select()
        .fields({
            'MGROUP.GROUP_ID': '"groupId"',
            'MGROUP.GROUP_TYPE':'"groupType"',
            'USERGROUP.USER_ID':'"userId"'
        })
        .from('SS_MST_USER_GROUP', 'USERGROUP')
        .left_join('SS_MST_GROUP', 'MGROUP', 'MGROUP.GROUP_ID = USERGROUP.GROUP_ID')
        .where('USERGROUP.EXPIRE_DATE <= ?', yesterday)
        .toParam()
    )
    if(Array.isArray(result)){
        let i=0;
        while(i < result.length){
            if(result[i].groupId === authGrantedGroupId){
                await createUserGroup(result[i].userId, authExpiredGroupId);
            }
            await deleteUserGroup(result[i].userId, result[i].groupId)
            await cache.delAsync('[checkUserAuth]@'+result[i].userId);
            i++;
        }
    }
    return result;
}

exports.getUserGroup = async (userId, groupType) => {
    if (!groupType) {
        let cachedData = await cache.getAsync('[getUserGroup]@' + util.getYYYYMMDD() + userId);
        if (cachedData) {
            return cachedData;
        }
    }
    let query = builder.select()
        .fields({
            'MGROUP.GROUP_ID': '"groupId"',
            'MGROUP.GROUP_NAME': '"groupName"',
            'MGROUP.GROUP_DESCRIPTION': '"groupDescription"',
            'MGROUP.GROUP_ICON_PATH': '"groupIconPath"',
            'MGROUP.GROUP_TYPE': '"groupType"',
            'MGROUP.PARENT_GROUP_ID': '"parentGroupId"',
            'MGROUP.IS_OPEN_TO_USERS': '"isOpenToUsers"'
        })
        .from(builder.select().fields(['USER_ID', 'GROUP_ID']).from('SS_MST_USER_GROUP').where('USER_ID = ?', userId).where('EXPIRE_DATE > ?', util.getYYYYMMDD()), 'USERGROUP');
    if (groupType) {
        if (typeof groupType === 'string') {
            groupType = [groupType];
        }
        query.join(builder.select().from('SS_MST_GROUP').where('GROUP_TYPE IN ?', groupType), 'MGROUP', 'MGROUP.GROUP_ID = USERGROUP.GROUP_ID')
    } else {
        query.join('SS_MST_GROUP', 'MGROUP', 'MGROUP.GROUP_ID = USERGROUP.GROUP_ID')
    }
    let result = await pool.executeQuery('getUserGroup' + (groupType ? groupType.length : ''),
        query
            .order('MGROUP.ORDER_NUMBER')
            .toParam()
    );
    if (!groupType && Array.isArray(result)) {
        cache.setAsync('[getUserGroup]@' + util.getYYYYMMDD() + userId, result, 3600 * 12);
    }
    return result;
}

exports.getGroupByRegion = async (region) => {
    return await pool.executeQuery('getGroupByRegion',
        builder.select()
            .fields({
                'GROUP_ID': '"groupId"',
                'GROUP_NAME': '"groupName"',
                'GROUP_DESCRIPTION': '"groupDescription"',
                'GROUP_ICON_PATH': '"groupIconPath"',
                'GROUP_TYPE': '"groupType"',
                'PARENT_GROUP_ID': '"parentGroupId"',
                'IS_OPEN_TO_USERS': '"isOpenToUsers"',
                'EXPIRE_PERIOD': '"expirePeriod"'
            })
            .from('SS_MST_GROUP')
            .where('GROUP_NAME = ?', region)
            .where('GROUP_TYPE = \'R\'')
            .toParam()
    )
}
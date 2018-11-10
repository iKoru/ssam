const pool = require('./db').instance,
    builder = require('./db').builder;
const util = require('../util');

const getGroup = async(groupId) => {
    return await pool.executeQuery('getGroup',
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
        .where('GROUP_ID = ?', groupId)
        .limit(1)
        .toParam()
    );
}

exports.getGroup = getGroup;

exports.getGroups = async(isAdmin, groupType = ['N', 'M', 'G', 'R'], page = 1) => {
    return isAdmin ?
        await pool.executeQuery('getGroupsForAdmin' + groupType.length,
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
            .where('GROUP_TYPE IN ?', groupType)
            .limit(30)
            .offset((page - 1) * 30)
            .order('ORDER_NUMBER')
            .toParam()
        ) :
        await pool.executeQuery('getGroups' + groupType.length,
            builder.select()
            .fields({
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
            .limit(30)
            .offset((page - 1) * 30)
            .order('ORDER_NUMBER')
            .toParam()
        );
};

exports.createGroup = async(group) => {
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

exports.updateGroup = async(group) => {
    return await pool.executeQuery(null,
        builder.update()
        .table('SS_MST_GROUP')
        .setFields({
            'GROUP_NAME': group.groupName || builder.rstr('GROUP_NAME'),
            'GROUP_DESCRIPTION': group.description || builder.rstr('GROUP_DESCRIPTION'),
            'GROUP_TYPE': group.groupType || builder.rstr('GROUP_TYPE'),
            'ORDER_NUMBER': util.isNumeric(group.orderNumber) ? group.orderNumber : builder.rstr('ORDER_NUMBER'),
            'IS_OPEN_TO_USERS': group.isOpenToUsers !== undefined ? group.isOpenToUsers : builder.rstr('IS_OPEN_TO_USERS'),
            'EXPIRE_PERIOD': util.isNumeric(group.expirePeriod) ? group.expirePeriod : builder.rstr('EXPIRE_PERIOD')
        })
        .where('GROUP_ID = ?', group.groupId)
        .toParam()
    );
}

exports.deleteGroup = async(groupId) => {
    return await pool.executeQuery('deleteGroup',
        builder.delete()
        .from('SS_MST_GROUP')
        .where('GROUP_ID = ?', groupId)
        .toParam()
    );
}

exports.createUserGroup = async(userId, groupId) => {
    let group = await getGroup(groupId);
    if (group.length === 0) {
        return 0;
    }

    group = group[0];
    let expireDate;
    if (group.expirePeriod > 0) {
        expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + group.expirePeriod);
    } else {
        expireDate = '99991231';
    }
    return await pool.executeQuery('createUserGroup',
        builder.insert()
        .into('SS_MST_USER_GROUP')
        .setFields({
            'USER_ID': userId,
            'GROUP_ID': group.groupId,
            'EXPIRE_DATE': expireDate
        })
        .toParam()
    );
}

exports.deleteUserGroup = async(userId, groupId) => {
    return await pool.executeQuery('deleteUserGroup',
        builder.delete()
        .from('SS_MST_USER_GROUP')
        .where('USER_ID = ?', userId)
        .where('GROUP_ID = ?', groupId)
        .toParam()
    );
}

exports.getUserGroup = async(userId) => {
    const today = util.getYYYYMMDD();
    return await pool.executeQuery('getUserGroup',
        builder.select()
        .fields({
            'MGROUP.GROUP_ID': '"groupId"',
            'MGROUP.GROUP_NAME': '"groupName"',
            'MGROUP.GROUP_DESCRIPTION': '"groupDescription"',
            'MGROUP.GROUP_ICON_PATH': '"groupIconPath"',
            'MGROUP.GROUP_TYPE': '"groupType"',
            'MGROUP.PARENT_GROUP_ID': '"parentGroupId"'
        })
        .from(builder.select().fields(['USER_ID', 'GROUP_ID']).from('SS_MST_USER_GROUP').where('USER_ID = ?', userId).where('EXPIRE_DATE > ?', today), 'USERGROUP')
        .join('SS_MST_GROUP', 'MGROUP', 'MGROUP.GROUP_ID = USERGROUP.GROUP_ID')
        .order('MGROUP.ORDER_NUMBER')
        .toParam()
    );
}
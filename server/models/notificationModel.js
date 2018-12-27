const pool = require('./db').instance,
    builder = require('./db').builder,
    { getYYYYMMDDHH24MISS } = require('../util');

exports.getNotification = async (notificationId) => {
    return await pool.executeQuery('getNotification',
        builder.select()
            .fields({
                'NOTIFICATION_ID': '"notificationId"',
                'CREATED_DATETIME': '"createdDateTime"',
                'TYPE': '"type"',
                'USER_ID': '"userId"',
                'TEMPLATE': '"template"',
                'VARIABLE1': '"variable1"',
                'VARIABLE2': '"variable2"',
                'VARIABLE3': '"variable3"',
                'VARIABLE4': '"variable4"',
                'IS_READ': '"isRead"',
                'HREF': '"href"'
            })
            .from('SS_HST_USER_NOTIFICATION')
            .where('NOTIFICATION_ID = ?', notificationId)
            .toParam()
    );
}

exports.getNotifications = async (userId, datetimeBefore = null, type = null, target = null) => {
    let query = builder.select()
        .fields({
            'NOTIFICATION_ID': '"notificationId"',
            'CREATED_DATETIME': '"createdDateTime"',
            'TYPE': '"type"',
            'USER_ID': '"userId"',
            'TEMPLATE': '"template"',
            'VARIABLE1': '"variable1"',
            'VARIABLE2': '"variable2"',
            'VARIABLE3': '"variable3"',
            'VARIABLE4': '"variable4"',
            'IS_READ': '"isRead"',
            'HREF': '"href"',
            'count(*) OVER()': '"totalCount"'
        })
        .from('SS_HST_USER_NOTIFICATION')
        .where('USER_ID = ?', userId)
        .where('IS_READ = false');
    if (datetimeBefore) {
        query.where('CREATED_DATETIME < ?', datetimeBefore);
    }
    if (type) {
        query.where('TYPE = ?', type);
    }
    if (target) {
        query.where('TARGET = ?', target)
    }
    return await pool.executeQuery('getNotifications' + (datetimeBefore ? 'date' : '') + (type ? 'type' : '') + (target ? 'target' : ''),
        query.order('CREATED_DATETIME', false)
            .order('IS_READ', true)
            .limit(5)
            .toParam()
    );
}

exports.updateNotification = async (notification) => {
    let query = builder.update().table('SS_HST_USER_NOTIFICATION')
        .setFields({
            'TEMPLATE': (notification.template || builder.rstr('TEMPLATE')),
            'VARIABLE1': (notification.variable1 || builder.rstr('VARIABLE1')),
            'VARIABLE2': (notification.variable2 || builder.rstr('VARIABLE2')),
            'VARIABLE3': (notification.variable3 || builder.rstr('VARIABLE3')),
            'VARIABLE4': (notification.variable4 || builder.rstr('VARIABLE4')),
            'IS_READ': (notification.isRead !== undefined ? notification.isRead : builder.rstr('IS_READ')),
            'HREF': (notification.href || builder.rstr('HREF'))
        })
        .where('NOTIFICATION_ID = ?', notification.notificationId)
    if (notification.userId) {
        query
            .where('USER_ID = ?', notification.userId)
    }
    return await pool.executeQuery('updateNotification' + (notification.userId ? 'user' : 'all'),
        query.toParam()
    );
}

exports.createNotification = async (notification, users) => {
    if (users && users.length > 0) {//send target
        return await pool.executeQuery('createNotificationG' + users.length,
            builder.insert()
                .into('SS_HST_USER_NOTIFICATION')
                .setFieldsRows(
                    users.map(x => {
                        return {
                            'NOTIFICATION_ID': builder.rstr('CAST(nextval(\'SEQ_SS_HST_USER_NOTIFICATION\') AS INTEGER)'),
                            'USER_ID': x,
                            'CREATED_DATETIME': getYYYYMMDDHH24MISS(),
                            'TYPE': notification.type,
                            'TEMPLATE': notification.template,
                            'VARIABLE1': notification.variable1,
                            'VARIABLE2': notification.variable2,
                            'VARIABLE3': notification.variable3,
                            'VARIABLE4': notification.variable4,
                            'IS_READ': false,
                            'HREF': notification.href,
                            'TARGET': notification.target
                        }
                    })
                )
                .toParam()
        );
    } else if (!users && notification.userId) {
        return await pool.executeQuery('createNotification',
            builder.insert()
                .into('SS_HST_USER_NOTIFICATION')
                .setFields({
                    'NOTIFICATION_ID': builder.rstr('CAST(nextval(\'SEQ_SS_HST_USER_NOTIFICATION\') AS INTEGER)'),
                    'USER_ID': notification.userId,
                    'CREATED_DATETIME': getYYYYMMDDHH24MISS(),
                    'TYPE': notification.type,
                    'TEMPLATE': notification.template,
                    'VARIABLE1': notification.variable1,
                    'VARIABLE2': notification.variable2,
                    'VARIABLE3': notification.variable3,
                    'VARIABLE4': notification.variable4,
                    'IS_READ': false,
                    'HREF': notification.href,
                    'TARGET': notification.target
                })
                .returning('NOTIFICATION_ID', '"notificationId"')
                .toParam()
        );
    } else if (!users && !notification.userId) {//send all
        let array = ['NOTIFICATION_ID', 'USER_ID', 'CREATED_DATETIME', 'TEMPLATE', 'TYPE'],
            query = builder.select();
        query.field(builder.rstr('CAST(nextval(\'SEQ_SS_HST_USER_NOTIFICATION\') AS INTEGER)').toString(), 'NOTIFICATION_ID')
            .field('USER_ID', 'USER_ID')
            .field(`'${getYYYYMMDDHH24MISS()}'`, 'CREATED_DATETIME')
            .field(`'${notification.template}'`, 'TEMPLATE')
            .field(`'${notification.type}'`, 'TYPE')
        if (notification.target) {
            query.field(`'${notification.target}'`, 'TARGET');
            array.push('TARGET')
        }
        if (notification.href) {
            query.field(`'${notification.href}'`, 'HREF');
            array.push('HREF')
        }
        if (notification.variable1) {
            query.field(`'${notification.variable1}'`, 'VARIABLE1');
            array.push('VARIABLE1');
        }
        if (notification.variable2) {
            query.field(`'${notification.variable2}'`, 'VARIABLE2');
            array.push('VARIABLE2');
        }
        if (notification.variable3) {
            query.field(`'${notification.variable3}'`, 'VARIABLE3');
            array.push('VARIABLE3');
        }
        if (notification.variable4) {
            query.field(`'${notification.variable4}'`, 'VARIABLE4');
            array.push('VARIABLE4');
        }

        return await pool.executeQuery(null,
            builder.insert()
                .into('SS_HST_USER_NOTIFICATION')
                .fromQuery(array,
                    query
                        .from('SS_MST_USER')
                        .where('STATUS <> \'BLOCKED\'')
                        .where('STATUS <> \'DELETED\'')
                )
                .toParam()
        );
    }
}

exports.deleteNotification = async (notificationId) => {
    return await pool.executeQuery('deleteNotification',
        builder.delete()
            .from('SS_HST_USER_NOTIFICATION')
            .where('NOTIFICATION_ID = ?', notificationId)
            .toParam()
    );
}

exports.clearNotification = async (userId) => {
    return await pool.executeQuery('clearNotification',
        builder.update()
            .table('SS_HST_USER_NOTIFICATION')
            .set('IS_READ = true')
            .where('USER_ID = ?', userId)
            .toParam()
    )
}
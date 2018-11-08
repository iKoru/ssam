const pool = require('./db').instance,
    builder = require('./db').builder,
    {getYYYYMMDDHH24MISS} = require('../util');

exports.getNotification = async(notificationId) => {
    return await pool.executeQuery('getNotification',
        builder.select()
            .fields({
                'NOTIFICATION_ID':'"notificationId"',
                'CREATED_DATETIME':'"createdDatetime"',
                'TYPE':'"type"',
                'TEMPLATE':'"template"',
                'VARIABLE1':'"variable1"',
                'VARIABLE2':'"variable2"',
                'VARIABLE3':'"variable3"',
                'VARIABLE4':'"variable4"',
                'IS_READ':'"isRead"',
                'HREF':'"href"'
            })
            .from('SS_HST_USER_NOTIFICATION')
            .where('NOTIFICATION_ID = ?', notificationId)
            .toParam()
    );
}

exports.getNotifications = async(userId, datetimeBefore = null, type = null) => {
    if(!userId || userId === ''){
        return [];
    }
    let query = builder.select()
            .fields({
                'NOTIFICATION_ID':'"notificationId"',
                'CREATED_DATETIME':'"createdDatetime"',
                'TYPE':'"type"',
                'TEMPLATE':'"template"',
                'VARIABLE1':'"variable1"',
                'VARIABLE2':'"variable2"',
                'VARIABLE3':'"variable3"',
                'VARIABLE4':'"variable4"',
                'IS_READ':'"isRead"',
                'HREF':'"href"'
            })
            .from('SS_HST_USER_NOTIFICATION')
            .where('USER_ID = ?', userId);
    if(datetimeBefore){
        query.where('CREATED_DATETIME < ?', datetimeBefore);
    }
    if(type){
        query.where('TYPE = ?', type);
    }
    return await pool.executeQuery('getNotifications' + (datetimeBefore?'date':'') + (type?'type':''),
        query.order('CREATED_DATETIME', false).limit(10)
        .toParam()
    );
}

exports.updateNotification = async(notification) => {
    return await pool.executeQuery('updateNotification',
        builder.update().table('SS_HST_USER_NOTIFICATION')
        .setFields({
            'CREATED_DATETIME':(notification.createdDatetime || builder.rstr('CREATED_DATETIME')),
            'TYPE': (notification.type || builder.rstr('TYPE')),
            'TEMPLATE':(notification.template || builder.rstr('TEMPLATE')),
            'VARIABLE1':(notification.variable1 || builder.rstr('VARIABLE1')),
            'VARIABLE2':(notification.variable2 || builder.rstr('VARIABLE2')),
            'VARIABLE3':(notification.variable3 || builder.rstr('VARIABLE3')),
            'VARIABLE4':(notification.variable4 || builder.rstr('VARIABLE4')),
            'IS_READ':(notification.isRead !== undefined? notification.isRead : builder.rstr('IS_READ')),
            'HREF':(notification.href || builder.rstr('HREF'))
        }).where('NOTIFICATION_ID = ?', notification.notificationId)
        .toParam()
    );
}

exports.createNotification = async(notification) => {
    return await pool.executeQuery('createNotification',
        builder.insert()
            .into('SS_HST_USER_NOTIFICATION')
            .setFields({
                'NOTIFICATION_ID':builder.rstr('CAST(nextval(\'SEQ_SS_HST_USER_NOTIFICATION\') AS INTEGER)'),
                'USER_ID':notification.userId,
                'CREATED_DATETIME':getYYYYMMDDHH24MISS(),
                'TYPE': notification.type,
                'TEMPLATE': notification.template,
                'VARIABLE1': notification.variable1,
                'VARIABLE2': notification.variable2,
                'VARIABLE3': notification.variable3,
                'VARIABLE4': notification.variable4,
                'IS_READ': false,
                'HREF': notification.href
            })
            .toParam()
    );
}

exports.deleteNotification = async(notificationId) => {
    return await pool.executeQuery('deleteNotification',
        builder.delete()
            .from('SS_HST_USER_NOTIFICATION')
            .where('NOTIFICATION_ID = ?', notificationId)
            .toParam()
    );
}
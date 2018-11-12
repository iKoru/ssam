/* global expect */
const notificationModel = require('../server/models/notificationModel');
const util = require('../server/util'),
    constants = require('../server/constants');

test('get notifications', async() => {
    expect(await notificationModel.getNotifications('orange')).toHaveLength(0);
    expect(await notificationModel.getNotifications()).toHaveLength(0);
});

test('create notification', async() => {
    expect(await notificationModel.createNotification({
        userId: 'orange',
        type: 'AA',
        createdDatetime: util.getYYYYMMDDHH24MISS(),
        template: '하하하 템플릿',
        variable1: '중에 끼워넣기',
        href: '/aa'
    })).toHaveProperty('rowCount', 1);
});

test('get notification', async() => {
    const notification = await notificationModel.getNotifications('orange');
    expect(notification.length).toBeGreaterThan(0);
    expect(await notificationModel.getNotification(notification[0].notificationId)).toHaveLength(1);
});

test('update notification', async() => {
    let notification = await notificationModel.getNotifications('orange');
    expect(notification[0].template).toEqual('하하하 템플릿');
    notification[0].template = '하하하 템플릿2';
    expect(await notificationModel.updateNotification(notification[0])).toEqual(1);
    notification = await notificationModel.getNotification(notification[0].notificationId);
    expect(notification[0].template).toEqual('하하하 템플릿2');
    notification[0].template = '하하하 템플릿';
    expect(await notificationModel.updateNotification(notification[0])).toEqual(1);
});

test('delete notification', async() => {
    const notification = await notificationModel.getNotifications('orange');
    expect(notification.length).toEqual(1);
    notification.forEach(async(c) => {
        expect(await notificationModel.deleteNotification(c.notificationId)).toBeGreaterThan(0);
    })
});
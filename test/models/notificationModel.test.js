/* global expect */
const notificationModel = require('../../server/models/notificationModel');
const util = require('../../server/util');

test('get notifications', async (done) => {
    expect((await notificationModel.getNotifications('orange')).length).toBeGreaterThanOrEqual(0);
    expect(await notificationModel.getNotifications()).toHaveLength(0);
    done();
});

test('crud notification', async (done) => {
    expect(await notificationModel.createNotification({
        userId: 'orange',
        type: 'AA',
        createdDatetime: util.getYYYYMMDDHH24MISS(),
        template: '하하하 템플릿',
        variable1: '중에 끼워넣기',
        href: '/aa'
    })).toHaveProperty('rowCount', 1);
    let notification = await notificationModel.getNotifications('orange');
    expect(Array.isArray(notification)).toBeTruthy();
    expect(await notificationModel.getNotification(notification[0].notificationId)).toHaveLength(1);

    expect(notification[0].template).toEqual('하하하 템플릿');
    notification[0].template = '하하하 템플릿2';
    expect(await notificationModel.updateNotification(notification[0])).toEqual(1);
    notification = await notificationModel.getNotification(notification[0].notificationId);
    expect(notification[0].template).toEqual('하하하 템플릿2');
    notification[0].template = '하하하 템플릿';
    expect(await notificationModel.updateNotification(notification[0])).toEqual(1);

    expect(await notificationModel.deleteNotification(notification[0].notificationId)).toBeGreaterThan(0);
    done();
});

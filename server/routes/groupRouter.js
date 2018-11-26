const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly'),
    checkSignin = require('../middlewares/checkSignin'),
    util = require('../util');
const groupModel = require('../models/groupModel')
    //based on /group

router.get('/', checkSignin, async(req, res) => { //get group list
    let groupType = undefined;
    if (req.query.groupType) {
        switch (typeof req.query.groupType) {
            case 'string':
                groupType = [req.query.groupType]
                break;
            case 'object':
                if (Array.isArray(req.query.groupType)) {
                    groupType = req.query.groupType;
                } else {
                    return res.status(400).json({ target: 'groupType', message: '잘못된 요청입니다.' });
                }
                break;
        }
        if (groupType) {
            groupType = groupType.filter(x => ['N', 'M', 'G', 'R'].includes(x));
            if (groupType.length < 1) {
                return res.status(200).json([]);
            }
        }
    }
    if (req.query.page && (!Number.isInteger(req.query.page) || req.query.page < 1)) {
        return res.status(400).json({ target: 'page', message: '잘못된 요청입니다.' })
    }
    let result = await groupModel.getGroups(req.userObject ? req.userObject.isAdmin : false, groupType, req.query.page)
    if (!Array.isArray(result)) {
        logger.error('그룹정보 조회 중 에러 : ', result, req.userObject.userId, groupType)
        return res.status(500).json({ message: `그룹 정보를 받아오는 중에 오류가 발생했습니다.[${result.code || ''}]` });
    } else {
        return res.status(200).json(result);
    }
});

router.post('/', adminOnly, async(req, res) => { //create new group
    let group = {...req.body };
    //parameter safe check
    if (typeof group.groupName !== 'string' || group.groupName === '') {
        return res.status(400).json({ target: 'groupName', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.groupDescription && typeof group.groupDescription !== 'string') {
        return res.status(400).json({ target: 'groupDescription', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.groupIconPath && typeof group.groupIconPath !== 'string') {
        return res.status(400).json({ target: 'groupIconPath', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.groupIconPath && group.groupIconPath.length > 200) {
        return res.status(400).json({ target: 'groupIconPath', message: 'Icon Path 값이 너무 깁니다. 관리자에게 문의해주세요.' });
    } else if (!['N', 'M', 'G', 'R'].includes(group.groupType)) {
        return res.status(400).json({ target: 'groupType', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.parentGroupId && !Number.isInteger(group.parentGroupId) || group.parentGroupId < 1) {
        return res.status(400).json({ target: 'parentGroupId', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (!Number.isInteger(group.expirePeriod)) {
        return res.status(400).json({ target: 'expirePeriod', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (typeof group.isOpenToUsers !== 'boolean') {
        return res.status(400).json({ target: 'isOpenToUsers', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    }

    //parameter length check
    group.groupName = util.safeStringLength(group.groupName, 50);
    group.groupDescription = util.safeStringLength(group.groupDescription, 500);

    let result = await groupModel.createGroup(group)
    if ((typeof result === 'object' && result.code) || result.rowCount === 0) {
        logger.error('그룹 생성 중 에러 : ', result, req.userObject.userId, group)
        return res.status(500).json({ message: `그룹을 추가하던 중 오류가 발생했습니다.[${result.code || ''}]` });
    } else {
        return res.status(200).json({ message: `${group.groupName} 그룹을 추가하였습니다.`, groupId: result.rows[0].groupId });
    }
});

router.put('/', adminOnly, async(req, res) => { //update current group
    let group = {...req.body };
    //parameter safe check
    if (!Number.isInteger(group.groupId)) {
        return res.status(400).json({ target: 'groupId', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.groupName && (typeof group.groupName === 'object' || group.groupName === '')) {
        return res.status(400).json({ target: 'groupName', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.groupDescription && typeof group.groupDescription !== 'string') {
        return res.status(400).json({ target: 'groupDescription', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.groupIconPath && typeof group.groupIconPath !== 'string') {
        return res.status(400).json({ target: 'groupIconPath', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.groupIconPath && group.groupIconPath.length > 200) {
        return res.status(400).json({ target: 'groupIconPath', message: 'Icon Path 값이 너무 깁니다. 관리자에게 문의해주세요.' });
    } else if (group.groupType && !['N', 'M', 'G', 'R'].includes(group.groupType)) {
        return res.status(400).json({ target: 'groupType', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.parentGroupId && !Number.isInteger(group.parentGroupId) || group.parentGroupId < 1) {
        return res.status(400).json({ target: 'parentGroupId', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.expirePeriod && !Number.isInteger(group.expirePeriod)) {
        return res.status(400).json({ target: 'expirePeriod', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.isOpenToUsers !== undefined && typeof group.isOpenToUsers !== 'boolean') {
        return res.status(400).json({ target: 'isOpenToUsers', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    } else if (group.orderNumber !== undefined && !Number.isInteger(group.orderNumber)) {
        return res.status(400).json({ target: 'orderNumber', message: '작업 진행에 필요한 값이 올바르지 않거나 누락되었습니다.' });
    }

    //parameter length check
    group.groupName = util.safeStringLength(group.groupName + '', 50);
    group.groupDescription = util.safeStringLength(group.groupDescription, 500);

    let result = await groupModel.updateGroup(group)
    if (typeof result === 'object') {
        logger.error('그룹 변경 중 에러 : ', result, req.userObject.userId, group)
        return res.status(500).json({ message: `그룹을 변경하던 중 오류가 발생했습니다.[${result.code || ''}]` });
    } else if (result === 0) {
        return res.status(404).json({ message: '존재하지 않는 그룹ID입니다.' });
    } else {
        return res.status(200).json({ message: `그룹을 변경하였습니다.` });
    }
});

router.delete('/:groupId([0-9]+)', adminOnly, async(req, res) => { //delete existing group
    let groupId = req.params.groupId;
    if (typeof groupId === 'string') {
        groupId = Number(groupId);
    }
    if (!Number.isInteger(groupId)) {
        return res.status(400).json({ target: 'groupId', message: '잘못된 접근입니다.' });
    }
    let result = await groupModel.deleteGroup(groupId);
    if (typeof result === 'object' || result === 0) {
        logger.error('그룹 삭제 중 에러 : ', result, req.userObject.userId, groupId)
        return res.status(500).json({ message: `그룹을 삭제하던 중 오류가 발생했습니다.[${result.code || ''}]` });
    } else {
        return res.status(200).json({ message: '그룹을 삭제하였습니다.' });
    }
});
module.exports = router;
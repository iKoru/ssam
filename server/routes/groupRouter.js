const router = require('express').Router();
const adminOnly = require('../middlewares/adminOnly'),
    checkSignin = require('../middlewares/checkSignin'),
    util = require('../util'),
    logger = require('../logger'),
    {groupTypeDomain}= require('../constants'),
    config = require('../../config');
const groupModel = require('../models/groupModel')
//based on /group

router.get('/', checkSignin, async (req, res) => { //get group list
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
                    return res.status(400).json({ target: 'groupType', message: '그룹 종류 값이 올바르지 않습니다.' });
                }
                break;
        }
        if (groupType) {
            groupType = groupType.filter(x => groupTypeDomain.includes(x));
            if (groupType.length < 1) {
                return res.status(200).json([]);
            }
        }
    }
    if (req.query.page && (!Number.isInteger(req.query.page) || req.query.page < 1)) {
        return res.status(400).json({ target: 'page', message: '페이지 값이 올바르지 않습니다.' })
    }
    let result = await groupModel.getGroups(req.userObject ? req.userObject.isAdmin : false, groupType, req.query.page)
    if (!Array.isArray(result)) {
        logger.error('그룹정보 조회 중 에러 : ', result, req.userObject.userId, groupType)
        return res.status(500).json({ message: `그룹 정보를 받아오는 중에 오류가 발생했습니다.[${result.code || ''}]` });
    } else {
        return res.status(200).json(result);
    }
});

router.post('/', adminOnly, async (req, res) => { //create new group
    let group = { ...req.body };
    //parameter safe check
    if (typeof group.expirePeriod === 'string') {
        group.expirePeriod = 1 * group.expirePeriod;
    }
    if (typeof group.parentGroupId === 'string') {
        group.parentGroupId = 1 * group.parentGroupId;
    }
    if (typeof group.groupName !== 'string' || group.groupName === '' || group.groupName.length > 50) {
        return res.status(400).json({ target: 'groupName', message: '그룹 이름 값이 너무 길거나(최대 50자) 올바르지 않습니다.' });
    } else if (group.groupDescription && (typeof group.groupDescription !== 'string' || group.groupDescription.length > 500)) {
        return res.status(400).json({ target: 'groupDescription', message: '그룹 설명 값이 너무 길거나(최대 500자) 올바르지 않습니다.' });
    } else if (group.groupIconPath && typeof group.groupIconPath !== 'string') {
        return res.status(400).json({ target: 'groupIconPath', message: '그룹 아이콘 경로가 올바르지 않습니다.' });
    } else if (group.groupIconPath && group.groupIconPath.length > 200) {
        return res.status(400).json({ target: 'groupIconPath', message: '그룹 아이콘 경로가 너무 깁니다(최대 200자). 관리자에게 문의해주세요.' });
    } else if (!groupTypeDomain.includes(group.groupType)) {
        return res.status(400).json({ target: 'groupType', message: '그룹 종류 값이 올바르지 않습니다.' });
    } else if (group.parentGroupId !== null && group.parentGroupId !== undefined && (!Number.isInteger(group.parentGroupId) || group.parentGroupId < 1)) {
        return res.status(400).json({ target: 'parentGroupId', message: '상위 그룹 ID가 올바르지 않습니다.' });
    } else if (!Number.isInteger(group.expirePeriod)) {
        return res.status(400).json({ target: 'expirePeriod', message: '만료기간 값이 올바르지 않습니다.' });
    } else if (typeof group.isOpenToUsers !== 'boolean') {
        return res.status(400).json({ target: 'isOpenToUsers', message: '그룹 공개여부가 올바르지 않습니다.' });
    }

    //parameter length check
    group.groupName = util.safeStringLength(group.groupName, 50);
    group.groupDescription = util.safeStringLength(group.groupDescription, 500);

    let result;
    if (group.groupType === 'E') {
        result = await groupModel.getGroup(config.authExpiredGroupId);
        if (Array.isArray(result) && result.length > 0) {
            return res.status(400).json({ target: 'groupType', message: '인증 만료 그룹은 반드시 한 개의 그룹만 지정할 수 있고, 현재 하나가 존재합니다.' })
        }
    }
    result = await groupModel.createGroup(group)
    if ((typeof result === 'object' && result.code) || result.rowCount === 0) {
        logger.error('그룹 생성 중 에러 : ', result, req.userObject.userId, group)
        return res.status(500).json({ message: `그룹을 추가하던 중 오류가 발생했습니다.[${result.code || ''}]` });
    } else {
        return res.status(200).json({ message: `${group.groupName} 그룹을 추가하였습니다.`, groupId: result.rows[0].groupId });
    }
});

router.put('/', adminOnly, async (req, res) => { //update current group
    let group = { ...req.body };
    //parameter safe check
    if (typeof group.groupId === 'string') {
        group.groupId = 1 * group.groupId;
    }
    if (typeof group.expirePeriod === 'string') {
        group.expirePeriod = 1 * group.expirePeriod;
    }
    if (typeof group.parentGroupId === 'string') {
        group.parentGroupId = 1 * group.parentGroupId;
    }
    if (!Number.isInteger(group.groupId)) {
        return res.status(400).json({ target: 'groupId', message: '그룹 ID가 올바르지 않습니다.' });
    } else if (group.groupName && (typeof group.groupName === 'object' || group.groupName === '')) {
        return res.status(400).json({ target: 'groupName', message: '그룹 이름이 올바르지 않습니다.' });
    } else if (group.groupDescription && typeof group.groupDescription !== 'string') {
        return res.status(400).json({ target: 'groupDescription', message: '그룹 설명이 올바르지 않습니다.' });
    } else if (group.groupIconPath && typeof group.groupIconPath !== 'string') {
        return res.status(400).json({ target: 'groupIconPath', message: '그룹 아이콘 경로가 올바르지 않습니다.' });
    } else if (group.groupIconPath && group.groupIconPath.length > 200) {
        return res.status(400).json({ target: 'groupIconPath', message: '그룹 아이콘 경로가 너무 깁니다. 관리자에게 문의해주세요.' });
    } else if (!groupTypeDomain.includes(group.groupType)) {
        return res.status(400).json({ target: 'groupType', message: '그룹 종류 값이 올바르지 않습니다.' });
    } else if (group.parentGroupId !== undefined && group.parentGroupId !== null && (!Number.isInteger(group.parentGroupId) || group.parentGroupId < 1)) {
        return res.status(400).json({ target: 'parentGroupId', message: '상위 그룹 ID가 올바르지 않습니다.' });
    } else if (group.expirePeriod !== undefined && !Number.isInteger(group.expirePeriod)) {
        return res.status(400).json({ target: 'expirePeriod', message: '만료기간 값이 올바르지 않습니다.' });
    } else if (group.isOpenToUsers !== undefined && typeof group.isOpenToUsers !== 'boolean') {
        return res.status(400).json({ target: 'isOpenToUsers', message: '그룹 공개여부가 올바르지 않습니다.' });
    } else if (group.orderNumber !== undefined && !Number.isInteger(group.orderNumber)) {
        return res.status(400).json({ target: 'orderNumber', message: '그룹 순서가 올바르지 않습니다.' });
    }

    //parameter length check
    group.groupName = util.safeStringLength(group.groupName + '', 50);
    group.groupDescription = util.safeStringLength(group.groupDescription, 500);

    let result = await groupModel.getGroup(group.groupId);
    if (!Array.isArray(result)) {
        logger.error('그룹 변경 중 에러 : ', result, req.userObject.userId, group)
        return res.status(500).json({ message: `그룹을 변경하던 중 오류가 발생했습니다.[${result.code || ''}]` });
    } else if (result.length === 0) {
        return res.status(404).json({ message: '존재하지 않는 그룹ID입니다.' });
    } else {
        if (group.groupId === config.authExpiredGroupId && (group.groupType !== undefined && group.groupType !== 'E')) {
            return res.status(400).json({ target: 'groupType', message: '인증만료 그룹은 다른 종류의 그룹으로 변경할 수 없습니다.' })
        }
        if (group.groupId === config.authGrantedGroupId && (group.groupType !== undefined && group.groupType !== 'A')) {
            return res.status(400).json({ target: 'groupType', message: '이메일 인증 설정 그룹은 다른 종류의 그룹으로 변경할 수 없습니다.' })
        }
        result = await groupModel.updateGroup(group)
        if (typeof result === 'object') {
            logger.error('그룹 변경 중 에러 : ', result, req.userObject.userId, group)
            return res.status(500).json({ message: `그룹을 변경하던 중 오류가 발생했습니다.[${result.code || ''}]` });
        } else if (result === 0) {
            return res.status(404).json({ message: '존재하지 않는 그룹ID입니다.' });
        } else {
            return res.status(200).json({ message: `그룹을 변경하였습니다.` });
        }
    }
});

router.delete('/:groupId([0-9]+)', adminOnly, async (req, res) => { //delete existing group
    let groupId = req.params.groupId;
    if (typeof groupId === 'string') {
        groupId = 1 * groupId;
    }
    if (!Number.isInteger(groupId) || groupId === 0) {
        return res.status(400).json({ target: 'groupId', message: '삭제할 그룹ID가 올바르지 않습니다.' });
    }
    if (groupId === config.authExpiredGroupId) {
        return res.status(400).json({ target: 'groupId', message: '인증 만료 그룹은 삭제할 수 없습니다.' })
    }
    if(groupId === config.authGrantedGroupId){
        return res.status(400).json({target:'groupId', message:'이메일 인증 설정 그룹은 삭제할 수 없습니다.'})
    }

    let result;
    result = await groupModel.getGroup(groupId);
    if (!Array.isArray(result)) {
        logger.error('그룹 삭제 중 에러 : ', result, req.userObject.userId, groupId)
        return res.status(500).json({ message: `그룹을 삭제하던 중 오류가 발생했습니다.[${result.code || ''}]` });
    } else if (result.length === 0) {
        return res.status(404).json({ target: 'groupId', message: '삭제할 그룹이 존재하지 않습니다.' });
    }

    result = await groupModel.deleteGroup(groupId);
    if (typeof result === 'object') {
        logger.error('그룹 삭제 중 에러 : ', result, req.userObject.userId, groupId)
        return res.status(500).json({ message: `그룹을 삭제하던 중 오류가 발생했습니다.[${result.code || ''}]` });
    } else if (result === 0) {
        return res.status(404).json({ target: 'groupId', message: '삭제할 그룹이 존재하지 않습니다.' });
    } else {
        return res.status(200).json({ message: '그룹을 삭제하였습니다.' });
    }
});
module.exports = router;
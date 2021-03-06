const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin'),
    requiredAuth = require('../middlewares/requiredAuth'),
    logger = require('../logger'),
    { dbErrorCode } = require('../constants');
const scrapModel = require('../models/scrapModel'),
    documentModel = require('../models/documentModel'),
    boardModel = require('../models/boardModel')
//based on /scrap

router.get('/group', requiredSignin, async (req, res) => { //scrapgroup
    let result = await scrapModel.getScrapGroupByUserId(req.userObject.userId);
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('스크랩그룹 조회 중 에러 : ', result, req.userObject.userId)
        return res.status(500).json({ message: `스크랩 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.[${result.code || ''}]` })
    }
});

router.post('/group', requiredSignin, async (req, res) => {
    let scrapGroupName = req.body.scrapGroupName;
    if (typeof scrapGroupName !== 'string' || scrapGroupName === '') {
        return res.status(400).json({ target: 'scrapGroupName', message: '스크랩 그룹 이름을 입력해주세요.' });
    } else if (scrapGroupName.length > 50) {
        return res.status(400).json({ target: 'scrapGroupName', message: '스크랩 그룹 이름은 50자 이내로 해주세요.' });
    }
    let result = await scrapModel.createScrapGroup(req.userObject.userId, scrapGroupName);
    if (result.rowCount === 1 && result.rows && result.rows.length > 0 && result.rows[0].scrapGroupId > 0) {
        return res.status(200).json({ message: '스크랩 그룹을 만들었습니다.', scrapGroupId: result.rows[0].scrapGroupId })
    } else {
        logger.error('스크랩 그룹 생성 에러 : ', result, req.userObject.userId, scrapGroupName);
        return res.status(500).json({ message: `스크랩 그룹을 만들지 못했습니다.[${result.code || ''}]` });
    }
})

router.delete(/\/group\/(\d+)(?:\/.*|\?.*)?$/, requiredSignin, async (req, res) => {
    let scrapGroupId = req.params[0];
    if (typeof scrapGroupId === 'string') {
        scrapGroupId = 1 * scrapGroupId;
    }
    if (!Number.isInteger(scrapGroupId) || scrapGroupId > 32767 || scrapGroupId === 0) {
        return res.status(400).json({ target: 'scrapGroupId', message: '스크랩 그룹이 올바르지 않습니다.' });
    }

    let result = await scrapModel.deleteScrapGroup(req.userObject.userId, scrapGroupId)
    if (typeof result === 'object') {
        logger.error('스크랩 그룹 삭제 중 에러 : ', result, req.userObject.userId, scrapGroupId)
        return res.status(500).json({ message: `스크랩 그룹을 삭제하지 못했습니다.[${result.code || ''}]` })
    } else if (result === 0) {
        return res.status(404).json({ target: 'scrapGroupId', message: '존재하지 않는 스크랩 그룹입니다.' })
    } else {
        return res.status(200).json({ message: '스크랩 그룹을 삭제하였습니다.' })
    }
})

router.put('/group', requiredSignin, async (req, res) => {
    let result;
    if(req.body.scrapGroups && Array.isArray(req.body.scrapGroups)){//일괄 처리
        if(req.body.scrapGroups.every(x=>x.status === 'DELETED')){
            return res.status(400).json({message:'최소 한 개 이상의 그룹은 남아있어야 합니다.'})
        }
        let currentScrapGroups = await scrapModel.getScrapGroupByUserId(req.userObject.userId);
        let scrapGroups = req.body.scrapGroups;
        let failedScrapGroup = [], processed = 0;
        if (Array.isArray(currentScrapGroups)) {
            let i = 0;
            while (i < scrapGroups.length) {
                if ((!scrapGroups[i].scrapGroupId || !currentScrapGroups.some(x=>x.scrapGroupId === scrapGroups[i].scrapGroupId))) { //new board
                    if(typeof scrapGroups[i].scrapGroupName !== 'string' || scrapGroups[i].scrapGroupName === '' || scrapGroups[i].scrapGroupName.length > 50){
                        failedScrapGroup.push(i+1);
                    }else{
                        result = await scrapModel.createScrapGroup(req.userObject.userId, scrapGroups[i].scrapGroupName)
                        if (!(result.rowCount === 1 && result.rows && result.rows.length > 0 && result.rows[0].scrapGroupId > 0)) {
                            logger.error('스크랩 그룹 생성 에러 : ', result, req.userObject.userId, scrapGroups[i].scrapGroupName);
                        }else{
                            processed ++;
                        }
                    }
                } else if (scrapGroups[i].status !== 'DELETED' && currentScrapGroups.some(x => x.scrapGroupId === scrapGroups[i].scrapGroupId) && currentScrapGroups.find(x=>x.scrapGroupId === scrapGroups[i].scrapGroupId).scrapGroupName !== scrapGroups[i].scrapGroupName) {//update group name check
                    if(typeof scrapGroups[i].scrapGroupName !== 'string' || scrapGroups[i].scrapGroupName === '' || scrapGroups[i].scrapGroupName.length > 50){
                        failedScrapGroup.push(i+1);
                    }else{
                        result = await scrapModel.updateScrapGroup(req.userObject.userId, scrapGroups[i].scrapGroupId, scrapGroups[i].scrapGroupName)
                        if (typeof result === 'object') {
                            logger.error('스크랩 그룹 이름 변경 중 에러 : ', result, req.userObject.userId, scrapGroups[i]);
                            failedScrapGroup.push(i+1);
                        } else if (result === 0) {
                            failedScrapGroup.push(i+1);
                        } else{
                            processed ++;
                        }
                    }
                } else if(scrapGroups[i].status === 'DELETED' && currentScrapGroups.some(x => x.scrapGroupId === scrapGroups[i].scrapGroupId)){
                    result = await scrapModel.deleteScrapGroup(req.userObject.userId, scrapGroups[i].scrapGroupId)
                    if (typeof result === 'object') {
                        logger.error('스크랩 그룹 삭제 중 에러 : ', result, req.userObject.userId, scrapGroups[i])
                        failedScrapGroup.push(i+1);
                    } else if (result === 0) {
                        failedScrapGroup.push(i+1);
                    } else{
                        processed ++;
                    }
                }
                i++;
            }
            if(failedScrapGroup.length > 0){
                return res.status(200).json({message:`변경 내용 중 ${processed}건은 반영하였으나, 일부 항목은 반영하지 못했습니다.`, failedGroup:failedScrapGroup})
            }else if(processed === 0){
                return res.status(400).json({message:'변경된 내용이 없습니다.'})
            }else{
                return res.status(200).json({message:'변경 내용을 반영하였습니다.'})
            }
        } else {
            logger.error('스크랩그룹 조회 중 에러 : ', result, req.userObject.userId)
            return res.status(500).json({ message: `스크랩 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.[${result.code || ''}]` })
        }
    }else{//개별 처리
        let scrapGroupName = req.body.scrapGroupName,
            scrapGroupId = req.body.scrapGroupId;
        if (typeof scrapGroupName !== 'string' || scrapGroupName === '') {
            return res.status(400).json({ target: 'scrapGroupName', message: '스크랩 그룹 이름을 입력해주세요.' });
        } else if (scrapGroupName.length > 50) {
            return res.status(400).json({ target: 'scrapGroupName', message: '스크랩 그룹 이름은 50자 이내로 해주세요.' });
        } else if (!Number.isInteger(scrapGroupId) || scrapGroupId > 32767 || scrapGroupId === 0) {
            return res.status(400).json({ target: 'scrapGroupId', message: '변경할 스크랩 그룹을 선택해주세요.' })
        }
    
        result = await scrapModel.updateScrapGroup(req.userObject.userId, scrapGroupId, scrapGroupName)
        if (typeof result === 'object') {
            logger.error('스크랩 그룹 이름 변경 중 에러 : ', result, req.userObject.userId, scrapGroupId, scrapGroupName);
            return res.status(500).json({ message: `스크랩 그룹 이름을 변경하지 못했습니다.[${result.code || ''}]` })
        } else if (result === 0) {
            return res.status(404).json({ target: 'scrapGroupId', message: '존재하지 않는 스크랩 그룹입니다.' })
        } else {
            return res.status(200).json({ message: '스크랩 그룹 이름을 변경하였습니다.' });
        }
    }
})

router.get('/', requiredSignin, async (req, res) => { //scrap in scrapgroup
    let scrapGroupId = req.query.scrapGroupId;///\/(\d+)(?:\/.*|\?.*)?$/params[0];
    if (typeof scrapGroupId === 'string') {
        scrapGroupId = 1 * scrapGroupId;
    }
    if (!Number.isInteger(scrapGroupId) || scrapGroupId > 32767 || scrapGroupId === 0) {
        return res.status(400).json({ target: 'scrapGroupId', message: '선택된 스크랩 그룹이 올바르지 않습니다.' });
    }
    let page = req.query.page;
    if (typeof page === 'string') {
        page = 1 * page
    }
    if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
        return res.status(400).json({ target: 'page', message: '페이지 값이 올바르지 않습니다.' });
    }

    let result = await scrapModel.getScraps(req.userObject.userId, scrapGroupId, page);
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('스크랩 기록 조회 중 에러 : ', result, req.userObject.userId);
        return res.status(500).json({ message: `스크랩 기록을 가져오는 데 실패하였습니다.[${result.code || ''}]` })
    }
});

router.post('/', requiredAuth, async (req, res) => { //add document into scrap group
    let scrapGroupId = req.body.scrapGroupId,
        documentId = req.body.documentId;
    if (!Number.isInteger(scrapGroupId) || scrapGroupId > 32767 || scrapGroupId === 0) {
        return res.status(400).json({ target: 'scrapGroupId', message: '저장할 스크랩 그룹을 선택해주세요.' })
    } else if (!Number.isInteger(documentId)) {
        return res.status(400).json({ target: 'documentId', message: '저장할 게시물을 선택해주세요.' });
    }
    let result = await scrapModel.getScrapGroup(req.userObject.userId, scrapGroupId);
    if (!Array.isArray(result) || result.length === 0) {
        return res.status(404).json({ target: 'scrapGroupId', message: '존재하지 않는 스크랩 그룹입니다.' })
    }
    result = await documentModel.getDocument(documentId);
    if (!Array.isArray(result) || result.length === 0 || result[0].isDeleted) {
        return res.status(404).json({ target: 'documentId', message: '존재하지 않는 게시물입니다.' })
    } else {
        result = await boardModel.checkUserBoardReadable(req.userObject.userId, result[0].boardId);
        if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
            return res.status(403).json({ target: 'documentId', message: '게시물을 볼 수 있는 권한이 없습니다.' })
        }
    }

    result = await scrapModel.createScrap(req.userObject.userId, scrapGroupId, documentId);
    if (result > 0) {
        return res.status(200).json({ message: '글을 스크랩했습니다.' });
    } else if (typeof result === 'object' && result.code === dbErrorCode.PKDUPLICATION) {
        return res.status(409).json({ message: '이미 해당 그룹에 스크랩되어있습니다.' });
    } else {
        logger.error('스크랩 추가 중 에러 : ', result, req.userObject.userId, scrapGroupId, documentId);
        return res.status(500).json({ message: `글을 스크랩하지 못했습니다.[${result.code || ''}]` });
    }
});

router.delete(/\/(\d+)\/(\d+)(?:\/.*|\?.*)?$/, requiredSignin, async (req, res) => {
    let scrapGroupId = req.params[0],
        documentId = req.params[1];
    if (typeof scrapGroupId === 'string') {
        scrapGroupId = 1 * scrapGroupId;
    }
    if (typeof documentId === 'string') {
        documentId = 1 * documentId;
    }

    if (!Number.isInteger(scrapGroupId) || scrapGroupId > 32767 || scrapGroupId === 0) {
        return res.status(400).json({ target: 'scrapGroupId', message: '삭제할 스크랩 그룹을 선택해주세요.' })
    } else if (!Number.isInteger(documentId) || documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '삭제할 게시물을 선택해주세요.' });
    }

    let result = await scrapModel.deleteScrap(req.userObject.userId, scrapGroupId, documentId);
    if (result > 0) {
        return res.status(200).json({ message: '글을 스크랩에서 해제했습니다.' });
    } else if (result === 0) {
        return res.status(404).json({ message: '이미 해제되어있는 게시물입니다.' });
    } else {
        logger.error('스크랩 제거 중 에러 : ', result, req.userObject.userId, scrapGroupId, documentId);
        return res.status(500).json({ message: `글을 스크랩 해제하지 못했습니다.[${result.code || ''}]` });
    }
});

module.exports = router;
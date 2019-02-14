const scheduler = require('node-schedule');
const logger = require('./logger'),
    constants = require('./constants');
const groupModel = require('./models/groupModel'),
    boardModel = require('./models/boardModel')

const getUserPoint = (userCount) => {
    if(Number.isInteger(userCount)){
        if(userCount < 5){
            return 1;
        }else if(userCount < 10){
            return 2;
        }else if(userCount < 30){
            return 3;
        }else if(userCount < 50){
            return 4;
        }else if(userCount < 100){
            return 5;
        }else{
            return 6;
        }
    }else{
        return 0;
    }
}

const getRecentUserPoint = (recentUserCount) => {
    if(Number.isInteger(recentUserCount)){
        if(recentUserCount === 0){
            return 0;
        }else if(recentUserCount < 5){
            return 1;
        }else if(recentUserCount < 10){
            return 2;
        }else if(recentUserCount < 15){
            return 3;
        }else if(recentUserCount < 20){
            return 4;
        }else if(recentUserCount < 25){
            return 5;
        }else{
            return 6;
        }
    }else{
        return 0;
    }
}

const getDocumentPoint = (documentCount) => {
    if(Number.isInteger(documentCount)){
        if(documentCount === 0){
            return 0;
        }else if(documentCount < 3){
            return 1;
        }else if(documentCount < 5){
            return 2;
        }else if(documentCount < 10){
            return 3;
        }else if(documentCount < 15){
            return 4;
        }else if(documentCount < 20){
            return 5;
        }else{
            return 6;
        }
    }else{
        return 0;
    }
}

const shuffleArray = (array) => {
    if(Array.isArray(array) && array.length > 1){
        let start = array.length - 10, end = array.length - 1, temp, i, random;
        if(start < 0){
            start = 0;
        }
        do{
            for(i=start; i<=end; i++){
                random = start + Math.floor(Math.random() * (end - start));
                if(random !== start){
                    temp = array[i];
                    array[i] = array[random];
                    array[random] = temp;
                }
            }
            start = start - 10;
            end = end - 10;
            if(start < 0){
                start = 0;
            }
        }while(end > 0);
    }
}

scheduler.scheduleJob('0 0 3 * * *', async () => { //trigger 03:00am everyday
    logger.log('start schedule job for deleting expired userGroup');
    let result = await groupModel.deleteExpiredUserGroup();
    if (Array.isArray(result)) {
        logger.log(`만료된 사용자 그룹 ${result.length}건 삭제 완료!`)
    } else {
        logger.error('만료된 사용자 그룹 자동삭제 중 에러 : ', result)
    }
    logger.log('start schedule job for applying reserved contents for boards')
    result = await boardModel.getReservedBoard();
    if (Array.isArray(result)) {
        let i = 0,
            check;
        while (i < result.length) {
            if (result[i].reservedContents.ownerId) {
                check = await boardModel.checkUserBoardWritable(result[i].reservedContents.ownerId, result[i].boardId)
                if (!(Array.isArray(check) && check.length > 0 && check[0].count > 0)) { //읽을 수 없으면, 즉 소유자가 될 권한이 없으면 소유자는 바꾸지 않음
                    delete result[i].reservedContents.ownerId;
                }
            }
            result[i].reservedContents.boardId = result[i].boardId;
            if(result[i].reservedContents.useCategory !== undefined){
                await boardModel.deleteBoardCategory(result[i].boardId);//reset categories
                if(result[i].reservedContents.useCategory){//create categories
                    await boardModel.createBoardCategory(result[i].boardId, constants.defaultTopicCategories);
                }
            }
            if (result[i].reservedContents.auth) {
                let j = 0;
                while (j < result[i].reservedContents.auth.length) {
                    if (result[i].reservedContents.auth[j].command === 'INSERT') {
                        await boardModel.createBoardAuth(result[i].boardId, result[i].reservedContents.auth[j].groupId, result[i].reservedContents.auth[j].authType)
                    } else if (result[i].reservedContents.auth[i].command === 'UPDATE') {
                        await boardModel.updateBoardAuth(result[i].boardId, result[i].reservedContents.auth[j].groupId, result[i].reservedContents.auth[j].authType)
                    } else if (result[i].reservedContents.auth[i].command === 'DELETE') {
                        await boardModel.deleteBoardAuth(result[i].boardId, result[i].reservedContents.auth[j].groupId)
                    }
                    j++;
                }
            }
            delete result[i].reservedContents.reservedContents; //prevent duplicate reservation
            delete result[i].reservedContents.reservedDate;
            check = await boardModel.updateBoard(result[i].reservedContents)
            if (check === 1) {
                logger.log(`변경 예약된 ${result[i].boardId} 게시판의 변경내용 반영 완료`)
            } else if (check === 0) {
                logger.error(`변경 예약된 ${result[i].boardId} 게시판 내용 반영 안됨 : 내용 확인 필요`, result[i].reservedContents)
            } else {
                logger.error(`변경 예약된 ${result[i].boardId} 게시판 내용 반영 중 에러 [${check.code || ''}]`, check, result[i].reservedContents)
            }
            i++;
        }
    } else {
        logger.error('변경 예약된 게시판 가져오기 중 에러 : ', result)
    }
    logger.log(`변경 예약된 게시판의 변경내용 반영 작업 완료 : 총 ${result.length}건 작업 진행함`)
    
    //topic reorder
    result = await boardModel.getTopicRatings();
    if(Array.isArray(result)){
        result = result.map(x=>({boardId:x.boardId, point:(getUserPoint(x.userCount) * 0.4) + (getRecentUserPoint(x.recentUserCount) * 0.3) + (getDocumentPoint(x.documentCount) * 0.3) }))
        result.sort((a, b) => (b.point - a.point));
        shuffleArray(result);
        
        result = result.map((x, index)=>({boardId:x.boardId, orderNumber:index+1}));//+1 : hot topic
        try{
            for(let i=0;i<result.length;i++){
                await boardModel.updateBoard(result[i]);
            }
        }catch(error){
            logger.error('토픽 정렬 후 저장 중 에러 : ', error);
        }
        logger.log(`토픽 재정렬 완료 : 총 ${result.length}개의 토픽에 대해 진행함`)
    }else{
        logger.error('토픽 정렬을 위한 정보 가져오기 중 에러 : ', result)
    }
})
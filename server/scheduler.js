const scheduler = require('node-schedule');
const logger = require('./logger');
const groupModel = require('./models/groupModel'),
    boardModel = require('./models/boardModel')

scheduler.scheduleJob('0 0 3 * * *', async () => { //trigger 03:00am everyday
    logger.log('start schedule job for deleting expired userGroup');
    let result = await groupModel.deleteExpiredUserGroup();
    if (typeof result === 'number') {
        logger.log(`만료된 사용자 그룹 ${result}건 삭제 완료!`)
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
})
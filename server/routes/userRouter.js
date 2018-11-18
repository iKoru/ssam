const router = require('express').Router();
const multer = require('multer')({ dest: 'profiles/', limits: { fileSize: 1024 * 200 } }),//max 200kB
    fs = require('fs');
const constants = require('../constants'),
    util = require('../util'),
    logger = require('../logger');
const adminOnly = require('../middlewares/adminOnly'),
    requiredSignin = require('../middlewares/requiredSignin');
const userModel = require('../models/userModel'),
    groupModel = require('../models/groupModel'),
    documentModel = require('../models/documentModel'),
    commentModel = require('../models/commentModel'),
    boardModel = require('../models/boardModel');
let moment = require('moment-timezone');
moment.tz.setDefault('Asia/Seoul');
//based on /user
router.put('/', requiredSignin, async (req, res) => {
    let user = { ...req.body };
    let parameters = { userId: user.userId };
    if (!req.userObject.isAdmin && (!user.userId || req.userObject.userId !== user.userId)) {
        res.status(400).json({ messagae: '잘못된 접근입니다.' });
    } else {
        let result;
        if (user.loungeNickName && typeof user.loungeNickName === 'string') {
            result = await userModel.checkNickName(user.userId, user.loungeNickName);
            if (result[0] && result[0].count > 0) {
                res.status(409).json({ target: 'loungeNickName', message: '이미 존재하는 라운지 필명입니다.' });
                return;
            } else {
                let i = 0;
                while (i < constants.reservedNickName.length) {
                    if (user.loungeNickName.indexOf(constants.reservedNickName[i]) >= 0) {
                        res.status(400).json({ target: 'loungeNickName', message: `입력하신 라운지 필명에 사용할 수 없는 문자열(${constants.reservedNickName[i]})이 포함되어있습니다.` });
                        return;
                    }
                    i++;
                }
            }
            parameters.loungeNickName = user.loungeNickName;
        }
        if (user.topicNickName) {
            result = await userModel.checkNickName(user.userId, user.topicNickName);
            if (result[0] && result[0].count > 0) {
                res.status(409).json({ target: 'topicNickName', message: '이미 존재하는 토픽 닉네임입니다.' });
                return;
            } else {
                let i = 0;
                while (i < constants.reservedNickName.length) {
                    if (user.topicNickName.indexOf(constants.reservedNickName[i]) >= 0) {
                        res.status(400).json({ target: 'topicNickName', message: `입력하신 토픽 닉네임에 사용할 수 없는 문자열(${constants.reservedNickName[i]})이 포함되어있습니다.` });
                        return;
                    }
                    i++;
                }
            }
            parameters.topicNickName = user.topicNickName;
        }
        if ((user.grade && user.grade !== req.userObject.grade) || (user.major && user.major !== req.userObject.major) || (user.email && user.email !== req.userObject.email)) {
            if (req.userObject.infoModifiedDate && moment(req.userObject.infoModifiedDate, 'YYYYMMDD').isValid()) {
                if (moment(req.userObject.infoModifiedDate, 'YYYYMMDD').year() >= moment().year()) {
                    res.status(400).json({ message: '올해 이미 내역을 변경하셨습니다.' });
                    return;
                }
            }
            if (user.grade && user.grade !== req.userObject.grade) {
                const grade = await groupModel.getGroup(user.grade);
                if (!(grade && grade[0] && grade[0].groupType === 'G' && (req.userObject.isAdmin || grade[0].isOpenToUsers))) {
                    res.status(400).json({ target: 'grade', message: '선택된 학년 값이 올바르지 않습니다.' });
                    return;
                }
                parameters.grade = user.grade;
            }
            if (user.major && user.major !== req.userObject.major) {
                const major = await groupModel.getGroup(user.major);
                if (!(major && major[0] && major[0].groupType === 'M' && (req.userObject.isAdmin || major[0].isOpenToUsers))) {
                    res.status(400).json({ target: 'major', message: '선택된 전공과목 값이 올바르지 않습니다.' });
                    return;
                }
                parameters.major = user.major;
            }
            if (user.email && user.email !== req.userObject.email) {
                const email = constants.emailRegex.exec(user.email);
                if (email) {//matched email
                    result = await userModel.checkEmail(user.email);
                    if (result && result[0] && result[0].count > 0) {
                        res.status(409).json({ target: 'email', message: '이미 사용중인 이메일입니다.' });
                        return;
                    }
                    const region = await groupModel.getGroupByRegion(constants.regionGroup[email[1]]);
                    if (region && region[0]) {
                        parameters.region = region[0].groupId;
                    } else {
                        res.status(400).json({ target: 'email', message: '해당 이메일 주소에 맞는 지역정보가 없습니다.' });
                        return;
                    }
                } else {
                    res.status(400).json({ target: 'email', message: '유효한 이메일 주소가 아니거나, 인증에 사용할 수 없는 이메일주소입니다.' });
                    return;
                }
            }
        }
        if (user.status) {
            if (user.status !== 'NORMAL' && user.status !== 'AUTHORIZED' && user.status !== 'BLOCKED' && user.status !== 'DELETED') {
                res.status(400).json({ target: 'status', message: '선택된 상태 값이 올바르지 않습니다.' });
                return;
            }
            parameters.status = user.status;
        }
        if (typeof user.isOpenInfo === 'boolean') {
            parameters.isOpenInfo = !!user.isOpenInfo;//make it as boolean
        }
        if (typeof user.isDeleted === 'boolean') {
            parameters.isDeleted = !!user.isDeleted;//make it as boolean
        }
        if (req.userObject.isAdmin && user.memo) {
            parameters.memo = user.memo;
        }
        if (req.userObject.isAdmin && typeof user.isAdmin === 'boolean') {
            parameters.isAdmin = !!user.isAdmin;//make it as boolean
        }
        if (typeof parameters.isAdmin === 'boolean') {
            result = await userModel.updateUserAdmin(parameters);
            if (result > 0 && Object.keys(parameters).length > 2) {//userId, isAdmin
                result = await userModel.updateUserInfo(parameters);
            }
            if (result < 1) {
                res.status(500).json({ message: '입력된 내용을 저장하지 못했습니다. 관리자에게 문의해주세요.(2)' });
            }
        } else {
            if (Object.keys(parameters).length > 1) {//userId
                result = await userModel.updateUserInfo(parameters);
                if (result < 1) {
                    res.status(500).json({ message: '입력된 내용을 저장하지 못했습니다. 관리자에게 문의해주세요.' });
                }
            } else {
                res.status(400).json({ message: '변경된 내용이 없습니다.' });
            }
        }
    }
});

router.post('/', async (req, res) => { //회원가입
    let user = { ...req.body };
    if (!user.userId) {
        res.status(400).json({ target: 'userId', message: '아이디를 입력해주세요.' });
        return;
    } else if (typeof user.userId !== 'string' || !constants.userIdRegex.test(user.userId)) {
        res.status(400).json({ target: 'userId', message: '입력하신 아이디가 올바르지 않습니다(알파벳 1자 이상, 총 4~50자).' });
        return;
    } else if (!user.password) {
        res.status(400).json({ target: 'password', message: '비밀번호를 입력해주세요.' });
        return;
    }
    let trial = 0;
    while (trial < constants.reserved.length) {
        if (user.userId.indexOf(constants.reserved[trial]) >= 0) {
            res.status(400).json({ target: 'userId', message: `입력하신 아이디는 사용할 수 없는 단어(${constants.reserved[trial]})를 포함하고 있습니다.` });
            return;
        }
        trial++;
    }
    if (constants.reserved.includes(user.userId)) {
    }
    let result = await userModel.checkUserId(user.userId);
    if (result && result[0] && result[0].count > 0) {
        res.status(409).json({ target: 'userId', message: '이미 등록된 아이디입니다.' });
        return;
    }
    if (!user.email) {
        res.status(400).json({ target: 'email', message: '이메일을 입력해주세요.' });
        return;
    }
    const email = constants.emailRegex.exec(user.email);
    if (email) {//matched email
        result = await userModel.checkEmail(user.email);
        if (result && result[0] && result[0].count > 0) {
            res.status(409).json({ target: 'email', message: '이미 사용중인 이메일입니다.' });
            return;
        }
        const region = await groupModel.getGroupByRegion(constants.regionGroup[email[1]]);
        if (region && region[0]) {
            if (!Array.isArray(user.userGroup)) {
                user.userGroup = [];
            }
            user.userGroup.push(region[0].groupId);
        } else {
            res.status(400).json({ target: 'email', message: '해당 이메일 주소에 맞는 지역정보가 없습니다.' });
            return;
        }
    } else {
        res.status(400).json({ target: 'email', message: '유효한 이메일 주소가 아니거나, 인증에 사용할 수 없는 이메일주소입니다.' });
        return;
    }
    if (user.grade) {
        result = await userModel.getGroup(user.grade, ['G']);
        if (result && result[0]) {
            if (!Array.isArray(user.userGroup)) {
                user.userGroup = [];
            }
            user.userGroup.push(user.grade);
        } else {
            res.status(400).json({ target: 'grade', message: '입력된 학년 값이 정확하지 않습니다.' });
            return;
        }
    }
    if (user.major) {
        result = await userModel.getGroup(user.major, ['M']);
        if (result && result[0]) {
            if (!Array.isArray(user.userGroup)) {
                user.userGroup = [];
            }
            user.userGroup.push(user.major);
        } else {
            res.status(400).json({ target: 'grade', message: '입력된 학년 값이 정확하지 않습니다.' });
            return;
        }
    }
    trial = 0;
    while (true) {
        user.nickName = util.partialUUID() + util.partialUUID();
        result = await userModel.checkNickName(user.userId, user.nickName);
        if (!result) {
            res.status(500).json({ message: '닉네임 생성에 실패하였습니다. 관리자에게 문의해주세요.' });
            return;
        } else if (result[0] && result[0].count === 0) {
            break;
        } else if (trial > 10) {//max 10 times trial
            res.status(500).json({ message: '닉네임 생성에 실패하였습니다. 관리자에게 문의해주세요.' });
            return;
        }
        trial += 1;
    }
    result = await userModel.createUser(user);
    if (result > 0) {
        //TODO : send email
        trial = 0;
        while (trial < user.userGroup) {
            result = await groupModel.createUserGroup(user.userId, user.userGroup[trial]);
            if (typeof result !== 'number') {
                userModel.deleteUser(user.userId);
                res.status(500).json({ message: '회원 정보를 저장하는 데 실패하였습니다. 관리자에게 문의해 주세요.' + (result.error ? `(${result.error})` : '') });
            }
            trial++;
        }
        res.status(200).json({ message: '회원가입에 성공하였습니다. 입력하신 이메일 주소로 인증메일을 보냈으니 확인해주세요.' });
    } else {
        res.status(500).json({ message: '회원 정보를 저장하는 데 실패하였습니다. 관리자에게 문의해주세요.' + (result.error ? `(${result.error})` : '') });
    }
});

router.post('/picture', requiredSignin, multer.single('picture'), async (req, res) => {//사진 업로드
    let userId = req.userObject.userId;
    if (!userId) {
        fs.unlink(req.file.path, (err) => {
            if (err) {
                logger.error(`파일 삭제 실패(임시 파일 삭제) : ${req.file.path}, ${err}`);
            }
        })
        res.status(400).json({ target: 'userId', message: '로그인 정보가 없습니다. 로그아웃 후 다시 시도해주세요.' });
    }
    if (req.userObject.picturePath) {
        fs.unlink(req.userObject.picturePath, (err) => {
            if (err) {
                logger.error(`파일 삭제 실패(저장된 파일 삭제) : ${req.userObject.picturePath}, ${err}`);
            }
        })
    }
    let result = await userModel.updateUserInfo({
        userId: userId,
        picturePath: req.file.path
    })
    if (result > 0) {
        res.status(200).json({ message: '정상적으로 반영되었습니다.', path: req.file.path });
    } else {
        fs.unlink(req.file.path, (err) => {
            if (err) {
                logger.error(`파일 삭제 실패(임시 파일 삭제..) : ${req.file.path}, ${err}`);
            }
        })
        res.status(500).json({ message: '사진 저장에 실패하였습니다. 다시 시도해주세요.' });
    }
});

router.get('/list', adminOnly, async (req, res) => {
    let result = await userModel.getUsers(req.body.userId, req.body.nickName, req.body.email, req.body.groupId, req.body.status, req.body.sortTarget, req.body.isAscending, req.body.page);
    if (result && Array.isArray(result)) {
        res.status(200).json(result)
    } else {
        res.status(500).json({ message: '회원 정보 검색에 실패하였습니다.', ...result })
    }
});

router.delete('/:userId', adminOnly, async (req, res) => {
    if (req.params.userId === req.userObject.userId) {
        res.status(400).json({ target: 'userId', message: '로그인 한 아이디는 삭제할 수 없습니다.' });
    } else if (req.params.userId) {
        let result = await userModel.deleteUser(req.params.userId)
        if (result > 0) {
            res.status(200).json({ message: req.params.userId + ' 아이디를 삭제하였습니다.' });
        } else {
            res.status(404).json({ target: 'userId', message: '해당하는 아이디는 존재하지 않습니다.' });
        }
    }
});

router.get('/document', requiredSignin, async (req, res) => {
    let result = await documentModel.getUserDocument(req.userObject.userId, req.userObject.isAdmin, req.query.page);
    if (Array.isArray(result)) {
        if (!req.userObject.isAdmin) {
            let i = 0;
            while (i < result.length) {
                delete result[i].userId;
                delete result[i].isDeleted;
                i++;
            }
        }
        res.status(200).json(result);
    } else {
        res.status(500).json({ message: '정보를 읽어오던 중 오류가 발생했습니다.' + result.code ? `(${result.code})` : '' })
    }
});

router.get('/comment', requiredSignin, async (req, res) => {
    let result = await commentModel.getUserComment(req.userObject.userId, req.userObject.isAdmin, req.query.page);
    if (Array.isArray(result)) {
        if (!req.userObject.isAdmin) {
            let i = 0;
            while (i < result.length) {
                delete result[i].isDeleted;
                i++;
            }
        }
        res.status(200).json(result);
    } else {
        res.status(500).json({ message: '정보를 읽어오던 중 오류가 발생했습니다.' + result.code ? `(${result.code})` : '' })
    }
});

router.get('/board', requiredSignin, async (req, res) => {
    let result = await boardModel.getUserBoard(req.userObject.userId, req.userObject.isAdmin);
    if (Array.isArray(result)) {
        res.status(200).json(result);
    } else {
        res.status(500).json({ message: '정보를 읽어오던 중 오류가 발생했습니다.' + result.code ? `(${result.code})` : '' })
    }
});

router.put('/board', requiredSignin, async (req, res) => {
    let boards = req.body.boards;
    if (!boards) {
        res.status(400).json({ message: 'boards', message: '잘못된 접근입니다.' });
    } else if (typeof boards === 'string') {
        boards = [boards];
    }
    let currentBoard = await boardModel.getUserBoard(req.userObject.userId, req.userObject.isAdmin);
    let result;
    let failedBoard = [];
    if (Array.isArray(currentBoard)) {
        let i = 0;
        while (i < boards.length) {
            if ((currentBoard.filter(x => x.boardId === boards[i])).length < 1) {//new board
                result = await boardModel.getBoard(boards[i]);
                if (result && result[0] && result[0].allGroupAuth !== 'NONE') {
                    result = await boardModel.createUserBoard(req.userObject.userId, boards[i])
                    if (typeof result === 'object') {
                        failedBoard.push(boards[i]);
                    }
                } else {
                    result = await boardModel.getUserBoardAuth(req.userObject.userId, boards[i]);
                    if (result && result.length > 0) {
                        result = await boardModel.createUserBoard(req.userObject.userId, boards[i]);
                        if (typeof result === 'object') {
                            failedBoard.push(boards[i]);
                        }
                    } else {
                        failedBoard.push(boards[i]);
                    }
                }
            }
            i++;
        }
        i = 0;
        while (i < currentBoard.length) {
            if ((boards.filter(x => x === currentBoard[i].boardId)).length < 1) {//deleted board
                result = await boardModel.deleteUserBoard(req.userObject.userId, currentBoard[i].boardId);
                if (typeof result === 'object') {
                    failedBoard.push(currentBoard[i].boardId);
                }
            }
            i++;
        }
    } else {
        res.status(500).json({ message: '기존 정보를 불러오던 중 오류가 발생했습니다.' + result.code ? `(${result.code})` : '' })
        return;
    }
    if (failedBoard.length > 0) {
        res.status(400).json({ message: `게시판을 구독할 권한이 없거나, 구독(취소) 시 오류가 ${failedBoard.length}건 발생하였습니다.`, boardId: failedBoard })
    } else {
        res.status(200).json({ message: '구독하는 게시판을 변경하였습니다.' });
    }
});

router.get('/group', adminOnly, async (req, res) => {
    let result = await groupModel.getUserGroup(req.body.userId);
    if (Array.isArray(result)) {
        res.status(200).json(result);
    } else {
        res.status(500).json({ message: '정보를 불러오던 중 오류가 발생했습니다.' + result.code ? `(${result.code})` : '' })
    }
});
router.put('/group', adminOnly, async (req, res) => {
    let groups = req.body.groups;
    if (!groups) {
        res.status(400).json({ message: 'groups', message: '잘못된 접근입니다.' });
    } else if (typeof groups === 'string') {
        groups = [groups];
    }
    let currentGroup = await groupModel.getUserGroup(req.userObject.userId);
    let result;
    let failedGroup = [];
    if (Array.isArray(currentGroup)) {
        let i = 0;
        while (i < groups.length) {
            if ((currentGroup.filter(x => x.groupId === groups[i])).length < 1) {//new group
                result = await boardModel.getBoard(groups[i]);
                if (result && result[0]) {
                    if (result[0].boardType !== 'N') {
                        let currentType = currentGroup.filter(x => x.groupType === result[0].groupType);
                        let j = 0;
                        while (j < currentType.length) {
                            groupModel.deleteUserGroup(req.userObject.userId, currentType[i].groupId);//delete current group with same group type
                        }
                    }
                    result = await groupModel.createUserGroup(req.userObject.userId, groups[i]);
                    if (typeof result === 'object') {
                        failedGroup.push(groups[i]);
                    }
                }
            }
            i++;
        }
        i = 0;
        while (i < currentGroup.length) {
            if ((groups.filter(x => x === currentGroup[i].boardId)).length < 1) {//deleted group
                result = await groupModel.deleteUserGroup(req.userObject.userId, currentGroup[i].groupId);
                if (typeof result === 'object') {
                    failedGroup.push(currentGroup[i].groupId);
                }
            }
            i++;
        }
    } else {
        res.status(500).json({ message: '기존 정보를 불러오던 중 오류가 발생했습니다.' + result.code ? `(${result.code})` : '' })
        return;
    }
    if (failedGroup.length > 0) {
        res.status(400).json({ message: `회원 그룹을 등록(제거)시 오류가 ${failedGroup.length}건 발생하였습니다.`, groupId: failedGroup })
    } else {
        res.status(200).json({ message: '회원 그룹을 변경하였습니다.' });
    }
});
module.exports = router;
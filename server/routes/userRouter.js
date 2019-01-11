const router = require('express').Router(),
    path = require('path'),
    bcrypt = require('bcrypt');
const constants = require('../constants'),
    util = require('../util'),
    logger = require('../logger'),
    config = require('../../config');
let multerLib = require('multer');
let multer = multerLib({
    dest: config.profileBasePath + 'public/profiles/', limits: { fileSize: 1024 * 200 }, fileFilter: function (req, file, cb) {
        let ext = path.extname(file.originalname).substring(1).toLowerCase();
        cb(null, constants.imageExtensions.includes(ext));
    }, storage: multerLib.diskStorage({ destination: config.profileBasePath + 'public/profiles/', filename: function (req, file, cb) { cb(null, util.UUID() + path.extname(file.originalname)) } })
});
const adminOnly = require('../middlewares/adminOnly'),
    requiredSignin = require('../middlewares/requiredSignin'),
    requiredAuth = require('../middlewares/requiredAuth'),
    checkSignin = require('../middlewares/checkSignin');
const userModel = require('../models/userModel'),
    groupModel = require('../models/groupModel'),
    documentModel = require('../models/documentModel'),
    commentModel = require('../models/commentModel'),
    boardModel = require('../models/boardModel'),
    scrapModel = require('../models/scrapModel'),
    messageModel = require('../models/messageModel');
//based on /user
router.put('/', requiredSignin, async (req, res) => {
    let user = { ...req.body };
    user.userId = req.userObject.isAdmin ? user.userId || req.userObject.userId : req.userObject.userId;
    let parameters = { userId: user.userId };
    let processed = false;
    if (!user.userId) {
        return res.status(400).json({ messagae: '잘못된 접근입니다.' });
    } else {
        let original;
        if (req.userObject.userId === user.userId) {
            original = req.userObject;
        } else {
            original = await userModel.getUser(user.userId);
            if (!Array.isArray(original)) {
                return res.status(500).json({ target: 'userId', message: `변경할 사용자를 찾지 못했습니다.[${original.code || ''}]` });
            } else if (original.length === 0) {
                return res.status(404).json({ target: 'userId', message: '변경할 사용자는 존재하지 않습니다.' })
            }
            original = original[0];
        }
        let result;
        if (typeof user.loungeNickName === 'string' && user.loungeNickName !== original.loungeNickName) {
            if (original.loungeNickNameModifiedDate && util.moment(original.loungeNickNameModifiedDate, 'YYYYMMDD').add(1, 'months').isAfter(util.moment()) && !req.userObject.isAdmin) {
                return res.status(400).json({ target: 'loungeNickName', message: `마지막으로 라운지 필명을 변경한 날(${util.moment(original.loungeNickNameModifiedDate, 'YYYYMMDD').format('Y.M.D')})로부터 1개월이 경과하지 않았습니다.` })
            }
            if (user.loungeNickName.length > 50) {
                return res.status(400).json({ target: 'loungeNickName', message: '입력된 라운지 필명이 너무 깁니다. 최대 50자로 입력해주세요.' });
            }
            result = await userModel.checkNickName(user.userId, user.loungeNickName);
            if (result[0] && result[0].count > 0) {
                return res.status(409).json({ target: 'loungeNickName', message: '이미 존재하는 라운지 필명입니다.' });
            } else if (!req.userObject.isAdmin) {
                let i = 0;
                while (i < constants.reservedNickName.length) {
                    if (user.loungeNickName.indexOf(constants.reservedNickName[i]) >= 0) {
                        return res.status(400).json({ target: 'loungeNickName', message: `입력하신 라운지 필명에 사용할 수 없는 문자열(${constants.reservedNickName[i]})이 포함되어있습니다.` });
                    }
                    i++;
                }
            }
            parameters.loungeNickName = user.loungeNickName;
        }
        if (typeof user.topicNickName === 'string' && user.topicNickName !== original.topicNickName) {
            if (original.topicNickNameModifiedDate && util.moment(original.topicNickNameModifiedDate, 'YYYYMMDD').add(1, 'months').isAfter(util.moment()) && !req.userObject.isAdmin) {
                return res.status(400).json({ target: 'topicNickName', message: `마지막으로 토픽 닉네임을 변경한 날(${util.moment(original.topicNickNameModifiedDate, 'YYYYMMDD').format('Y.M.D')})로부터 1개월이 경과하지 않았습니다.` })
            }
            if (user.topicNickName.length > 50) {
                return res.status(400).json({ target: 'topicNickName', message: '입력된 토픽 닉네임이 너무 깁니다. 최대 50자로 입력해주세요.' });
            }
            result = await userModel.checkNickName(user.userId, user.topicNickName);
            if (result[0] && result[0].count > 0) {
                return res.status(409).json({ target: 'topicNickName', message: '이미 존재하는 토픽 닉네임입니다.' });
            } else if (!req.userObject.isAdmin) {
                let i = 0;
                while (i < constants.reservedNickName.length) {
                    if (user.topicNickName.indexOf(constants.reservedNickName[i]) >= 0) {
                        return res.status(400).json({ target: 'topicNickName', message: `입력하신 토픽 닉네임에 사용할 수 없는 문자열(${constants.reservedNickName[i]})이 포함되어있습니다.` });
                    }
                    i++;
                }
            }
            parameters.topicNickName = user.topicNickName;
        }
        if (user.status && user.status !== original.status) {
            if (user.status !== 'NORMAL' && user.status !== 'DELETED') {
                return res.status(400).json({ target: 'status', message: '선택된 삭제 데이터가 올바르지 않습니다.' });
            }
            if (user.status === 'DELETED') {
                result = await boardModel.getBoardByOwnerId(user.userId);
                if (Array.isArray(result) && result.length > 0) {
                    return res.status(400).json({ message: '내가 토픽지기인 토픽이 존재합니다. 토픽 양도 후 탈퇴해주세요.' })
                }
            }
            parameters.status = user.status;
        }
        if ((user.grade !== undefined && user.grade !== original.grade) || (user.major !== undefined && user.major !== original.major) || (user.email !== undefined && user.email !== original.email)) {
            if (process.env.NODE_ENV !== 'development' && !req.userObject.isAdmin && util.moment().month() !== 2) { //month() === 2 is March
                return res.status(400).json({ message: '학년, 전공, 이메일은 매년 3월에만 변경이 가능합니다.' })
            }
            if (!req.userObject.isAdmin && original.infoModifiedDate && util.moment(original.infoModifiedDate, 'YYYYMMDD').isValid()) {
                if (util.moment(original.infoModifiedDate, 'YYYYMMDD').year() >= util.moment().year()) {
                    return res.status(400).json({ message: '올해 이미 내역을 변경하셨습니다.' });
                }
            }
            if (user.grade !== undefined && (user.grade !== original.grade)) {
                if (user.grade !== null) {
                    const grade = await groupModel.getGroup(user.grade, ['G']);
                    if (!(grade && grade[0] && (req.userObject.isAdmin || grade[0].isOpenToUsers))) {
                        return res.status(400).json({ target: 'grade', message: '선택된 학년 값이 올바르지 않습니다.' });
                    }
                }
                parameters.grade = user.grade;
            }
            if (user.major !== undefined && (user.major !== original.major)) {
                if (user.major !== null) {
                    const major = await groupModel.getGroup(user.major, ['M']);
                    if (!(major && major[0] && (req.userObject.isAdmin || major[0].isOpenToUsers))) {
                        return res.status(400).json({ target: 'major', message: '선택된 전공과목 값이 올바르지 않습니다.' });
                    }
                }
                parameters.major = user.major;
            }
            if (user.email && (user.email !== original.email)) {
                const email = constants.emailRegex.exec(user.email);
                if (email) { //matched email
                    if (email.length > 100) {
                        return res.status(400).json({ target: 'email', message: '입력된 이메일 주소의 길이가 너무 깁니다. 관리자에게 문의해주세요.' });
                    }
                    result = await userModel.checkEmail(user.email);
                    if (result && result[0] && result[0].count > 0) {
                        return res.status(409).json({ target: 'email', message: '이미 사용중인 이메일입니다.' });
                    }
                    const region = await groupModel.getGroupByRegion(constants.regionGroup[email[1]]);
                    if (region && region[0]) {
                        parameters.region = region[0].groupId;
                        parameters.email = user.email;
                    } else {
                        return res.status(400).json({ target: 'email', message: '해당 이메일 주소에 맞는 지역정보가 없습니다.' });
                    }
                } else {
                    return res.status(400).json({ target: 'email', message: '유효한 이메일 주소가 아니거나, 인증에 사용할 수 없는 이메일주소입니다.' });
                }
            }
        }
        if (req.userObject.isAdmin) {
            if (user.memo !== original.memo) {
                parameters.memo = user.memo;
            }
            if (typeof user.isAdmin === 'boolean' && user.isAdmin !== original.isAdmin) {
                parameters.isAdmin = !!user.isAdmin; //make it as boolean
            }
            delete parameters.major;
            delete parameters.grade;//관리자는 별도로 처리
        }
        if (typeof user.isOpenInfo === 'boolean' && user.isOpenInfo !== original.isOpenInfo) {
            parameters.isOpenInfo = !!user.isOpenInfo; //make it as boolean
        }
        if (user.password && user.password !== '') {
            result = await userModel.updateUserPassword({ userId: user.userId, password: await bcrypt.hash(user.password, config.bcryptSalt) });
            if (typeof result === 'object' || result < 1) {
                logger.error('비밀번호 변경 중 에러 : ', result, user.userId, original.userId);
                return res.status(500).json({ message: '비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.' });
            }
            processed = true;
        }
        if (user.picturePath === '' && original.picturePath) {
            try {
                result = await util.unlink(`${process.env.PWD}/${config.profileBasePath}/public${original.picturePath}`);
            } catch (error) {
                if (error.code !== 'ENOENT') {//이미 삭제할 내용이 없는 경우는 에러 아니게 처리
                    logger.error('프로필사진 삭제 중 에러 : ', error, user.userId, original.userId);
                    return res.status(500).json({ target: 'picturePath', message: `이미지를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.[${error.errno}]` })
                }
            }
            parameters.picturePath = null;
        }

        if (typeof parameters.isAdmin === 'boolean') {
            result = await userModel.updateUserAdmin(parameters);
            if (result > 0 && Object.keys(parameters).length > 2) { //userId, isAdmin
                result = await userModel.updateUserInfo(parameters);
            }
            if (typeof result === 'object' || result < 1) {
                logger.error('관리자 정보 저장 중 에러 : ', result, user.userId, original.userId)
                return res.status(500).json({ message: `입력된 내용을 저장하지 못했습니다. 관리자에게 문의해주세요.[${result.code || ''}]` });
            } else {
                return res.json({ message: '정상적으로 저장하였습니다.' });
            }
        } else {
            if (Object.keys(parameters).length > 1) { //userId
                result = await userModel.updateUserInfo(parameters);
                if (typeof result === 'object' || result < 1) {
                    logger.error('사용자 정보 변경 중 에러 : ', result, user.userId, original.userId);
                    return res.status(500).json({ message: `입력된 내용을 저장하지 못했습니다. 관리자에게 문의해주세요.[${result.code || ''}]` });
                } else {
                    return res.json({ message: '정상적으로 저장하였습니다.' });
                }
            } else if (processed) {
                return res.json({ message: '정상적으로 저장하였습니다.' });
            } else {
                return res.status(400).json({ message: '변경된 내용이 없습니다.' });
            }
        }
    }
});

router.post('/', checkSignin, async (req, res) => { //회원가입
    let user = {
        userId: req.body.userId,
        password: req.body.password,
        major: req.body.major,
        grade: req.body.grade,
        email: req.body.email,
        userGroup: []
    };
    if (!user.userId) {
        return res.status(400).json({ target: 'userId', message: '아이디를 입력해주세요.' });
    } else if (typeof user.userId !== 'string' || !constants.userIdRegex.test(user.userId)) {
        return res.status(400).json({ target: 'userId', message: '입력하신 아이디가 올바르지 않습니다(알파벳 1자 이상, 총 4~50자).' });
    } else if (!user.password) {
        return res.status(400).json({ target: 'password', message: '비밀번호를 입력해주세요.' });
    }
    let trial = 0;
    while (trial < constants.reserved.length) {
        if (user.userId.indexOf(constants.reserved[trial]) >= 0) {
            return res.status(400).json({ target: 'userId', message: `입력하신 아이디는 사용할 수 없는 단어(${constants.reserved[trial]})를 포함하고 있습니다.` });
        }
        trial++;
    }
    let result = await userModel.checkUserId(user.userId);
    if (result && result[0] && result[0].count > 0) {
        return res.status(409).json({ target: 'userId', message: '이미 등록된 아이디입니다.' });
    }
    if (user.email) {
        //return res.status(400).json({ target: 'email', message: '이메일을 입력해주세요.' });
        const email = constants.emailRegex.exec(user.email);
        if (email) { //matched email
            if (email.length > 100) {
                return res.status(400).json({ target: 'email', message: '입력된 이메일 주소의 길이가 너무 깁니다.(최대 100자)' });
            }
            result = await userModel.checkEmail(user.email);
            if (result && result[0] && result[0].count > 0) {
                return res.status(409).json({ target: 'email', message: '이미 사용중인 이메일입니다.' });
            }
            const region = await groupModel.getGroupByRegion(constants.regionGroup[email[1]]);
            if (region && region[0]) {
                user.userGroup.push(region[0].groupId);
            } else {
                return res.status(400).json({ target: 'email', message: '해당 이메일 주소에 맞는 지역정보가 없습니다.' });
            }
        } else {
            return res.status(400).json({ target: 'email', message: '유효한 이메일 주소가 아니거나, 인증에 사용할 수 없는 이메일주소입니다.' });
        }
    }
    if (user.grade) {
        result = await groupModel.getGroup(user.grade, ['G']);
        if (result && result[0]) {
            user.userGroup.push(user.grade);
        } else {
            return res.status(400).json({ target: 'grade', message: '입력된 학년 값이 정확하지 않습니다.' });
        }
    }
    if (user.major) {
        result = await groupModel.getGroup(user.major, ['M']);
        if (result && result[0]) {
            user.userGroup.push(user.major);
        } else {
            return res.status(400).json({ target: 'major', message: '입력된 전공과목 값이 정확하지 않습니다.' });
        }
    }
    trial = 0;
    while (true) {
        user.nickName = util.partialUUID() + util.partialUUID();
        result = await userModel.checkNickName(user.userId, user.nickName);
        if (Array.isArray(result) && result.length > 0 && result[0].count === 0) {
            break;
        } else if (trial > 10) { //max 10 times trial
            logger.error('닉네임 생성 시도 횟수 초과... 에러')
            return res.status(500).json({ message: '닉네임 생성에 실패하였습니다. 관리자에게 문의해주세요.' });
        }
        trial++;
    }
    user.password = await bcrypt.hash(user.password, config.bcryptSalt);
    if (req.userObject && req.userObject.isAdmin) {
        user.memo = req.body.memo;
        if (Array.isArray(req.body.groups) && req.body.groups.length > 0) {
            if (!Array.isArray(user.userGroup)) {
                user.userGroup = user.groups;
            } else {
                user.userGroup = user.userGroup.concat(req.body.groups);
            }
        }
        if (typeof req.body.isAdmin === 'boolean') {
            user.isAdmin = req.body.isAdmin;
        }
        if (['NORMAL', 'DELETED'].includes(req.body.status)) {
            user.status = req.body.status;
        }
        if (req.body.region) {
            user.userGroup.push(req.body.region)
        }
    }
    result = await userModel.createUser(user);
    if (typeof result !== 'object' && result > 0) {
        //TODO : send email
        trial = 0;
        while (trial < user.userGroup.length) {
            result = await groupModel.createUserGroup(user.userId, user.userGroup[trial]);
            if (typeof result !== 'number') {
                userModel.deleteUser(user.userId);
                logger.error('사용자 그룹 생성 도중 에러 : ', result, user.userId);
                return res.status(500).json({ message: `회원 정보를 저장하는 데 실패하였습니다. 관리자에게 문의해 주세요.[${result.code || ''}]` });
            }
            trial++;
        }
        await scrapModel.createScrapGroup(user.userId, '기본 그룹');
        return res.status(200).json({ message: '회원가입에 성공하였습니다. 입력하신 이메일 주소로 인증메일을 보냈으니 확인해주세요.', nickName: user.nickName });
    } else {
        logger.error('사용자 생성 중 에러 : ', result, user);
        return res.status(500).json({ message: `회원 정보를 저장하는 데 실패하였습니다. 관리자에게 문의해 주세요.[${result.code || ''}]` });
    }
});

router.post('/picture', requiredSignin, async (req, res) => { //사진 업로드
    multer.single('picture')(req, res, async function (error) {
        if (error instanceof multerLib.MulterError) {
            switch (error.code) {
                case 'LIMIT_FILE_SIZE':
                    return res.status(400).json({ target: 'picture', message: '최대 크기 200KB를 초과하였습니다.' });
                case 'LIMIT_PART_COUNT':
                    return res.status(400).json({ target: 'picture', message: '최대 분할크기를 초과하였습니다.' });
                case 'LIMIT_FILE_COUNT':
                    return res.status(400).json({ target: 'picture', message: '프로필 이미지는 1개만 등록해주세요.' });
                case 'LIMIT_FIELD_KEY':
                    return res.status(400).json({ target: 'picture', message: '파일 이름의 길이가 너무 깁니다. 길이를 짧게 변경해주세요.' })
                case 'LIMIT_FIELD_VALUE':
                    return res.status(400).json({ target: 'picture', message: '파일 필드의 길이가 너무 깁니다. 길이를 짧게 변경해주세요.' })
                case 'LIMIT_FIELD_COUNT':
                    return res.status(400).json({ target: 'picture', message: '파일 필드가 너무 많습니다. 필드 수를 줄여주세요.' })
                case 'LIMIT_UNEXPECTED_FILE':
                    return res.status(400).json({ target: 'picture', message: '업로드할 수 없는 파일 종류입니다.' })
            }
        } else if (error) {
            logger.error('프로필 이미지 업로드 중 에러!! ', error);
            return res.status(500).json({ target: 'picture', message: `이미지를 업로드하는 도중 오류가 발생하였습니다.[${error.message || ''}]` })
        }
        let userId = req.userObject.userId,
            result;
        if (typeof req.file === 'object' && req.file.filename) {
            const originalFilePath = config.profileBasePath + 'public/' + req.userObject.picturePath;
            try {
                await util.unlink(originalFilePath);
            } catch (error) {
                logger.error(error);
            }
            result = await userModel.updateUserPicture(userId, null, null, null, `/profiles/${req.file.filename}`)
            //result = await util.uploadFile([req.file], 'dev/public/profiles', userId, userModel.updateUserPicture);
            if (result > 0) {
                return res.status(200).json({ message: '정상적으로 반영되었습니다.', picturePath: `/profiles/${req.file.filename}` })
            } else {
                logger.error('프로필 이미지 저장 중 에러 : ', result, userId);
                return res.status(500).json({ message: '이미지 저장에 실패하였습니다. 다시 시도해주세요.' });
            }
        } else {
            return res.status(400).json({ target: 'file', message: '허용된 이미지 파일이 아닙니다. 확장자를 확인해주세요.' });
        }
    })
});

router.get('/', requiredSignin, async (req, res) => {
    let userId = req.userObject.isAdmin ? req.query.userId || req.userObject.userId : req.userObject.userId;
    let result;
    if (req.userObject.userId === userId) {
        result = { ...req.userObject };
    } else {
        result = await userModel.getUser(userId);
        if (!Array.isArray(result) || result.length === 0) {
            logger.error('사용자 정보 불러오기 중 에러 : ', result, userId, req.userObject.userId);
            return res.status(500).json({ message: `정보 불러오기에 실패하였습니다.[${result.code || ''}]` })
        }
    }
    delete result.password;
    if (!req.userObject.isAdmin) {
        delete result.isAdmin;
        delete result.inviter;
        delete result.memo;
        delete result.reserved1;
        delete result.reserved2;
        delete result.reserved3;
        delete result.reserved4;
    }
    let result2 = await groupModel.getUserGroup(userId);
    if (Array.isArray(result2)) {
        result.major = result2.find(x => x.groupType === 'M');
        if (result.major) {
            result.major = result.major.groupId;
        }
        result.grade = result2.find(x => x.groupType === 'G');
        if (result.grade) {
            result.grade = result.grade.groupId;
        }
        result.region = result2.find(x => x.groupType === 'R');
        if (result.region) {
            result.region = result.region.groupName;
        }
        if (result2.some(x => x.groupType === 'D')) {
            result.auth = 'DENIED'
        } else if (result2.some(x => x.groupType === 'A')) {
            result.auth = 'AUTHORIZED'
        } else if (result2.some(x => x.groupType === 'E')) {
            result.auth = 'EXPIRED'
        } else{
            result.auth = 'NORMAL'
        }

        result.groups = result2.filter(x => x.isOpenToUsers).map(x => x.groupId)
    }
    return res.status(200).json(result);
})

router.get('/list', adminOnly, async (req, res) => {
    let sortTarget = req.query.sortTarget;
    switch (sortTarget) {
        case 'email':
            sortTarget = 'EMAIL';
            break;
        case 'loungeNickName':
            sortTarget = 'LOUNGE_NICKNAME';
            break;
        case 'topicNickName':
            sortTarget = 'TOPIC_NICKNAME';
            break;
        case 'userId':
        default:
            sortTarget = 'USER_ID';
            break;
    }
    let result = await userModel.getUsers(req.query.userId, req.query.nickName, req.query.email, req.query.groupId, req.query.status, sortTarget, req.query.isAscending && req.query.isAscending === 'true', req.query.page);
    if (Array.isArray(result)) {
        return res.status(200).json(result)
    } else {
        logger.error('사용자 정보 검색 중 에러 : ', result)
        return res.status(500).json({ message: '회원 정보 검색에 실패하였습니다.', ...result })
    }
});

router.delete('/:userId', adminOnly, async (req, res) => {
    if (!req.params.userId) {
        return res.status(400).json({ target: 'userId', message: '삭제할 사용자 ID를 찾을 수 없습니다.' });
    }
    if (req.params.userId === req.userObject.userId) {
        return res.status(400).json({ target: 'userId', message: '로그인 한 아이디는 삭제할 수 없습니다.' });
    } else if (req.params.userId) {
        let result = await boardModel.getBoardByOwnerId(req.params.userId);
        if (Array.isArray(result) && result.length > 0) {
            return res.status(400).json({ target: 'userId', message: '해당하는 아이디가 관리중인 라운지/토픽이 존재합니다.' });
        }
        let j;
        while (true) {
            result = await messageModel.getChats(req.params.userId, null, null, 1); //삭제된 것은 제외되고 검색됨
            if (Array.isArray(result)) {
                j = 0;
                while (j < result.length) {
                    if (result[j].user1Id === req.params.userId) { //user1
                        if (result[j].user2Status === 'NORMAL') { //change flag
                            result = await messageModel.updateChat(result[j].chatId, req.params.userId, 'DELETED')
                        } else { //delete
                            result = await messageModel.deleteChat(result[j].chatId);
                        }
                    } else { //user2
                        if (result[j].user1Status === 'NORMAL') { //change flag
                            result = await messageModel.updateChat(result[j].chatId, req.params.userId, 'DELETED')
                        } else { //delete
                            result = await messageModel.deleteChat(result[j].chatId);
                        }
                    }
                    j++;
                }
                if (result.length === 10) { //다음 페이지도 있을 수 있으므로 다시 검색한다.
                    continue;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        result = await userModel.deleteUser(req.params.userId)
        if (result > 0) {
            return res.status(200).json({ message: req.params.userId + ' 아이디를 삭제하였습니다.' });
        } else {
            return res.status(404).json({ target: 'userId', message: '해당하는 아이디는 존재하지 않습니다.' });
        }
    }
});

router.get('/document', requiredSignin, async (req, res) => {
    let userId = req.userObject.isAdmin ? (req.query.userId || req.userObject.userId) : req.userObject.userId;
    if (typeof req.query.page === 'string') {
        req.query.page = 1 * req.query.page
    }
    if (req.query.page !== undefined && !Number.isInteger(req.query.page)) {
        return res.status(400).json({ target: 'page', message: '페이지를 찾을 수 없습니다.' });
    } else if (req.query.page === undefined || req.query.page < 1) {
        req.query.page = 1;
    }
    let result = await documentModel.getUserDocument(userId, req.userObject.isAdmin, req.query.page);
    if (Array.isArray(result)) {
        if (!req.userObject.isAdmin) {
            let i = 0;
            while (i < result.length) {
                delete result[i].userId;
                delete result[i].isDeleted;
                i++;
            }
        }
        return res.status(200).json(result);
    } else {
        logger.error('사용자 작성 게시물 조회 중 에러 : ', result, userId);
        return res.status(500).json({ message: '정보를 읽어오던 중 오류가 발생했습니다.' + result.code ? `(${result.code})` : '' })
    }
});

router.get('/comment', requiredSignin, async (req, res) => {
    let userId = req.userObject.isAdmin ? (req.query.userId || req.userObject.userId) : req.userObject.userId;
    if (typeof req.query.page === 'string') {
        req.query.page = 1 * req.query.page
    }
    if (req.query.page !== undefined && !Number.isInteger(req.query.page)) {
        return res.status(400).json({ target: 'page', message: '페이지를 찾을 수 없습니다.' });
    } else if (req.query.page === undefined || req.query.page < 1) {
        req.query.page = 1;
    }
    let result = await commentModel.getUserComment(userId, req.userObject.isAdmin, req.query.page);
    if (Array.isArray(result)) {
        if (!req.userObject.isAdmin) {
            let i = 0;
            while (i < result.length) {
                delete result[i].isDeleted;
                i++;
            }
        }
        return res.status(200).json(result);
    } else {
        logger.error('사용자 작성 댓글 조회 중 에러 : ', result, userId);
        return res.status(500).json({ message: '정보를 읽어오던 중 오류가 발생했습니다.' + result.code ? `(${result.code})` : '' })
    }
});

router.get('/board', requiredSignin, async (req, res) => {
    let userId = req.userObject.isAdmin ? (req.query.userId || req.userObject.userId) : req.userObject.userId;
    let result = await boardModel.getUserBoard(userId, null, req.userObject.isAdmin);
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('사용자 게시판 조회 중 에러 : ', result, userId);
        return res.status(500).json({ message: '정보를 읽어오던 중 오류가 발생했습니다.' + result.code ? `(${result.code})` : '' })
    }
});

router.post('/board', requiredAuth, async (req, res) => {
    let userId = req.userObject.isAdmin ? (req.body.userId || req.userObject.userId) : req.userObject.userId,
        boardId = req.body.boardId, result;
    if (typeof boardId !== 'string') {
        return res.status(400).json({ target: 'boardId', message: '구독할 토픽을 선택해주세요.' })
    }
    const board = await boardModel.getBoard(boardId);
    if (!Array.isArray(board) || board.length === 0 || board[0].status === 'DELETED') {
        return res.status(404).json({ target: 'boardId', message: '구독할 토픽을 찾을 수 없습니다.' })
    } else if (board[0].boardType !== 'T') {
        return res.status(400).json({ target: 'boardId', message: '구독할 필요가 없는 게시판입니다.' })
    }
    result = await boardModel.getUserBoard(userId, boardId, req.userObject.isAdmin);
    if (Array.isArray(result) && result.length > 0) {
        return res.status(409).json({ target: 'boardId', message: '이미 구독중인 토픽입니다.' })
    } else if (board[0].allGroupAuth !== 'READWRITE') {//모든 그룹 구독 가능하지 않은 경우 체크
        result = await boardModel.checkUserBoardSubscribable(userId, boardId);
        if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
            logger.warn('구독할 수 없는 토픽 구독 시도. ', userId, boardId, result)
            return res.status(403).json({ message: '구독할 수 있는 토픽이 아닙니다. 토픽 구독 조건을 참고해주세요.' })
        }
    }

    result = await boardModel.createUserBoard(userId, boardId);
    if (result > 0) {
        return res.status(200).json({ message: '토픽을 구독하였습니다.' });
    } else {
        return res.status(500).json({ message: `토픽을 구독하지 못했습니다.[${result.code || ''}]` })
    }
})

router.delete('/board/:boardId([a-zA-z]+)', requiredSignin, async (req, res) => {
    let boardId = req.params.boardId
    if (typeof boardId !== 'string' || boardId === '') {
        return res.status(400).json({ target: 'boardId', message: '구독을 해제할 토픽이 없습니다.' });
    }
    let result = await boardModel.getBoard(boardId);
    if (Array.isArray(result)) {
        if (result.length === 0) {
            return res.status(404).json({ target: 'boardId', message: '존재하지 않는 게시판입니다.' });
        } else if (result[0].boardType !== 'T') {
            return res.status(400).json({ target: 'boardId', message: '토픽만 구독을 해제할 수 있습니다.' });
        } else {
            if (result[0].ownerId === req.userObject.userId) {
                return res.status(400).json({ target: 'boardId', message: '내가 토픽지기인 토픽은 구독 해제할 수 없습니다. 토픽을 양도 혹은 삭제해주세요.' });
            }
            result = await boardModel.getUserBoard(req.userObject.userId, boardId);
            if (Array.isArray(result)) {
                if (result.length === 0) {
                    return res.status(400).json({ target: 'boardId', message: '현재 구독중인 토픽이 아닙니다.' });
                } else if ((result[0].readRestrictDate && util.moment(result[0].readRestrictDate, 'YYYYMMDD').isSameOrBefore(util.moment())) || (result[0].writeRestrictDate && util.moment(result[0].writeRestrictDate, 'YYYYMMDD').isSameOrBefore(util.moment()))) {
                    return res.status(400).json({ target: 'boardId', message: '현재 읽기/쓰기가 제한된 토픽은 구독 해제할 수 없습니다.' });
                }
                result = await boardModel.deleteUserBoard(req.userObject.userId, boardId);
                if (typeof result === 'object' || result === 0) {
                    logger.error('토픽 구독 해제 중 에러(3) : ', result, req.userObject.userId, boardId)
                    return res.status(500).json({ message: '토픽 구독을 해제하는 중에 오류가 발생했습니다.' });
                } else {
                    return res.status(200).json({ message: '토픽을 구독 해제하였습니다.' })
                }
            } else {
                logger.error('토픽 구독 해제 중 에러(2) : ', result, req.userObject.userId, boardId)
                return res.status(500).json({ message: '토픽 구독을 해제하는 중에 오류가 발생했습니다.' });
            }
        }
    } else {
        logger.error('토픽 구독 해제 중 에러 : ', result, req.userObject.userId, boardId)
        return res.status(500).json({ message: '토픽 구독을 해제하는 중에 오류가 발생했습니다.' });
    }
})

router.put('/board', requiredAuth, async (req, res) => {
    let boards = req.body.boards;
    if (!boards) {
        return res.status(400).json({ target: 'boards', message: '구독할 게시판을 선택해주세요.' });
    } else if (!Array.isArray(boards)) {
        boards = [boards];
    }
    let currentBoard = await boardModel.getUserBoard(req.userObject.userId, req.userObject.isAdmin);
    let result;
    let failedBoard = [];
    if (Array.isArray(currentBoard)) {
        let i = 0;
        while (i < boards.length) {
            if (!(currentBoard.find(x => x.boardId === boards[i].boardId))) { //new board
                result = await boardModel.getBoard(boards[i].boardId);
                if (Array.isArray(result) && result[0] && result[0].boardType === 'T') {
                    result = await boardModel.checkUserBoardSubscribable(req.userObject.userId, boards[i].boardId);
                    if ((result && result.length > 0 && result[0].count > 0) || req.userObject.isAdmin) {
                        result = await boardModel.createUserBoard(req.userObject.userId, boards[i].boardId);
                        if (typeof result === 'object' || result === 0) {
                            failedBoard.push(boards[i]);
                        }
                    } else {
                        failedBoard.push(boards[i]);
                    }
                } else { //라운지, 아카이브는 구독(취소) 대상 아님
                    failedBoard.push(boards[i]);
                }
            } else if (currentBoard.find(x => x.boardId === boards[i].boardId).orderNumber !== boards[i].orderNumber) {//update order check
                result = await boardModel.updateUserBoard(req.userObject.userId, boards[i].boardId, boards[i].orderNumber)
                if (typeof result === 'object' || result === 0) {
                    failedBoard.push(boards[i]);
                }
            }
            i++;
        }
        i = 0;
        while (i < currentBoard.length) {
            if (!(boards.find(x => x.boardId === currentBoard[i].boardId))) { //deleted board
                if ((currentBoard[i].writeRestrictDate && util.moment(currentBoard[i].writeRestrictDate, 'YYYYMMDD').isAfter(util.moment())) || (currentBoard[i].readRestrictDate && util.moment(currentBoard[i].readRestrictDate, 'YYYYMMDD').isAfter(util.moment()))) {
                    failedBoard.push(currentBoard[i].boardId);
                } else {
                    result = await boardModel.getBoard(currentBoard[i].boardId);
                    if (Array.isArray(result) && result.length > 0) {
                        if (result[0].ownerId === req.userObject.userId) {
                            failedBoard.push(-1);
                        } else {
                            result = await boardModel.deleteUserBoard(req.userObject.userId, currentBoard[i].boardId);
                            if (typeof result === 'object' || result === 0) {
                                failedBoard.push(currentBoard[i].boardId);
                            }
                        }
                    } else { //구독 취소 대상 없음
                        failedBoard.push(currentBoard[i].boardId);
                    }
                }
            }
            i++;
        }
    } else {
        logger.error('사용자 게시판 목록 조회 중 에러 : ', result, boards, req.userObject.userId);
        return res.status(500).json({ message: `기존 정보를 불러오던 중 오류가 발생했습니다.[${result.code || ''}]` })
    }
    if (failedBoard.length > 0) {
        if (failedBoard.indexOf(-1) >= 0) {
            return res.status(400).json({ message: '토픽지기는 토픽을 구독 취소할 수 없습니다. 먼저 토픽을 다른 사람에게 양도하시거나, 토픽 자체를 삭제해주세요.' });
        } else {
            return res.status(200).json({ message: `토픽을 구독할 권한이 없거나, 구독(취소) 과정에서 오류가 ${failedBoard.length}건 발생하였습니다.`, boardId: failedBoard })
        }
    } else {
        return res.status(200).json({ message: '구독하는 토픽을 변경하였습니다.' });
    }
});

router.get('/group', adminOnly, async (req, res) => {
    if (typeof req.query.userId !== 'string' || req.query.userId === '') {
        return res.status(400).json({ target: 'userId', message: '사용자를 찾을 수 없습니다.' });
    }
    let result = await groupModel.getUserGroup(req.query.userId);
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('사용자 그룹 정보 조회 중 에러 : ', result, req.query.userId)
        return res.status(500).json({ message: '정보를 불러오던 중 오류가 발생했습니다.' + result.code ? `(${result.code})` : '' })
    }
});
router.put('/group', adminOnly, async (req, res) => {
    if (!req.body.userId || typeof req.body.userId !== 'string' || req.body.userId === '') {
        return res.status(400).json({ message: 'userId', message: '사용자를 찾을 수 없습니다.' });
    }
    let groups = req.body.groups;
    if (!groups) {
        return res.status(400).json({ message: 'groups', message: '그룹 값이 올바르지 않습니다.' });
    } else if (typeof groups === 'string' || typeof groups === 'number') {
        groups = [groups];
    }
    let user = await userModel.getUser(req.body.userId);
    if (!Array.isArray(user) || user.length === 0) {
        return res.status(404).json({ message: 'userId', message: '사용자를 찾을 수 없습니다.' })
    }
    let currentGroup = await groupModel.getUserGroup(req.body.userId);
    let result;
    let failedGroup = [];
    if (Array.isArray(currentGroup)) {
        let i = 0;
        while (i < groups.length) {
            if ((currentGroup.filter(x => x.groupId === groups[i])).length < 1) { //new group
                result = await groupModel.getGroup(groups[i]);
                if (result && result[0]) {
                    if (['R', 'M', 'G'].includes(result[0].groupType)) {
                        let currentType = currentGroup.filter(x => x.groupType === result[0].groupType);
                        let j = 0;
                        while (j < currentType.length) {
                            groupModel.deleteUserGroup(req.body.userId, currentType[j].groupId); //delete current group with same group type
                            j++;
                        }
                    }
                    result = await groupModel.createUserGroup(req.body.userId, groups[i]);
                    if (typeof result === 'object') {
                        failedGroup.push(groups[i]);
                    }
                }
            }
            i++;
        }
        i = 0;
        while (i < currentGroup.length) {
            if ((groups.filter(x => x === currentGroup[i].groupId)).length < 1) { //deleted group
                result = await groupModel.deleteUserGroup(req.body.userId, currentGroup[i].groupId);
                if (typeof result === 'object') {
                    failedGroup.push(currentGroup[i].groupId);
                }
            }
            i++;
        }
    } else {
        logger.error('사용자 그룹 정보 조회 중 에러 : ', result, req.body.userId, groups)
        return res.status(500).json({ message: `기존 정보를 불러오던 중 오류가 발생했습니다.[${result.code || ''}]` })
    }
    if (failedGroup.length > 0) {
        return res.status(200).json({ message: `회원 그룹을 변경할 때 오류가 ${failedGroup.length}건 발생하였습니다.`, groupId: failedGroup });
    } else {
        return res.status(200).json({ message: '회원 그룹을 변경하였습니다.' });
    }
});
module.exports = router;
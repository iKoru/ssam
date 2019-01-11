const router = require('express').Router();
const visitorOnly = require('../middlewares/visitorOnly'),
    requiredSignin = require('../middlewares/requiredSignin'),
    requiredAuth = require('../middlewares/requiredAuth'),
    checkSignin = require('../middlewares/checkSignin'),
    { reserved, reservedNickName, boardTypeDomain, emailRegex, boardIdRegex } = require('../constants'),
    logger = require('../logger'),
    { moment } = require('../util');
const documentModel = require('../models/documentModel'),
    userModel = require('../models/userModel'),
    boardModel = require('../models/boardModel');

router.get('/index', visitorOnly('/'), (req, res) => {
    res.status(501).end();
});

router.get('/', requiredSignin, (req, res) => {
    res.status(501).end();
});

router.get('/profile', requiredAuth, async (req, res) => {
    let nickName = req.query.nickName;
    if (typeof nickName !== 'string') {
        return res.status(400).json({ target: 'nickName', message: '닉네임이 올바르지 않습니다.' })
    }
    let result = await userModel.getProfile(nickName);
    if (result.userId) {
        delete result.userId;
        return res.status(200).json(result);
    } else if (Object.keys(result).length === 0) {
        return res.status(404).json({ target: 'nickName', message: '사용자를 찾을 수 없습니다.' })
    } else {
        logger.error('프로필 조회 중 에러 : ', result, nickName);
        return res.status(500).json({ message: `프로필을 조회하지 못했습니다.[${result.code || ''}]` })
    }
});

router.post('/survey', requiredAuth, async (req, res) => {
    let survey = { documentId: req.body.documentId, answer: req.body.answer }
    if (typeof survey.documentId === 'string') {
        survey.documentId = 1 * survey.documentId
    }
    if (!Number.isInteger(survey.documentId) || survey.documentId === 0) {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
    let document = await documentModel.getDocument(survey.documentId);
    if (!Array.isArray(document) || document.length === 0) {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    } else if (document[0].isDeleted) {
        return res.status(403).json({ target: 'documentId', message: '삭제된 게시물입니다.' })
    } else if (!document[0].hasSurvey) {
        return res.status(400).json({ target: 'documentId', message: '설문조사가 없는 게시물입니다.' })
    }
    let check = await boardModel.checkUserBoardReadable(req.userObject.userId, document[0].boardId)
    if (!Array.isArray(check) || check[0].count === 0) {
        return res.status(403).json({ target: 'documentId', message: '게시물을 읽을 수 있는 권한이 없습니다.' });
    }
    let original = await documentModel.getDocumentSurvey(survey.documentId);
    if (!Array.isArray(original) || original.length === 0) {
        return res.status(404).json({ target: 'documentId', message: '설문조사가 없는 게시물입니다.' })
    } else if (survey.answer.length !== original[0].surveyContents.questions.length) {
        return res.status(400).json({ target: 'answer', message: '미응답 질문이 있습니다. 모든 질문에 응답해주세요.' })
    }

    check = await documentModel.createDocumentSurveyHistory(survey.documentId, req.userObject.userId, survey.answer);
    if (check > 0) {
        let i = 0, j;
        try {
            while (i < original[0].surveyContents.questions.length) {
                if (original[0].surveyContents.questions[i].allowMultipleChoice && Array.isArray(survey.answer[i])) {
                    j = 0;
                    while (j < survey.answer[i].length) {
                        original[0].surveyAnswers[i][survey.answer[i][j]]++;
                        j++;
                    }
                } else {
                    original[0].surveyAnswers[i][survey.answer[i]]++;
                }
                i++;
            }
        } catch (err) {
            logger.error('설문 내용 반영 중 에러 : ', err, survey.documentId, original[0].surveyContents, survey.answer);
            await documentModel.deleteDocumentSurveyHistory(survey.documentId, req.userObject.userId);
            return res.status(500).json({ message: `설문 응답을 저장하는 데 실패하였습니다.[${i + 1}번째 응답값이 올바르지 않습니다.]` })
        }
        check = await documentModel.updateDocumentSurvey(survey.documentId, original[0].surveyAnswers);
        if (typeof check === 'object' || check === 0) {
            await documentModel.deleteDocumentSurveyHistory(survey.documentId, req.userObject.userId)
            logger.error('설문 내용 제출 중 에러 : ', check, req.userObject.userId, survey.answer)
            return res.status(500).json({ message: `설문 응답을 저장하는 데 실패하였습니다.[${check.code} || '']` })
        } else {
            return res.status(200).json({ message: '설문 내용을 저장하였습니다.' });
        }
    } else {
        return res.status(409).json({ target: 'answer', message: '이미 참여한 설문입니다.' });
    }
});

router.get('/best', checkSignin, async (req, res) => {
    let boardType = req.query.boardType;
    if (boardType !== 'L' && boardType !== 'T') {
        return res.status(400).json({ target: 'boardType', message: '게시판 타입이 올바르지 않습니다.' });
    }

    let since = moment(),
        result = {};
    let daily = await documentModel.getPeriodicallyBestDocuments(boardType, since.format('YMMDD') + '000000');
    if (Array.isArray(daily)) {
        result.daily = daily
    } else {
        logger.error('오늘 베스트 가져오기 에러 : ', daily)
    }
    since.startOf('week');
    let weekly = await documentModel.getPeriodicallyBestDocuments(boardType, since.format('YMMDD') + '000000');
    if (Array.isArray(weekly)) {
        result.weekly = weekly
    } else {
        logger.error('이번주 베스트 가져오기 에러 : ', weekly)
    }
    since.startOf('month');
    let monthly = await documentModel.getPeriodicallyBestDocuments(boardType, since.format('YMMDD') + '000000');
    if (Array.isArray(monthly)) {
        result.monthly = monthly
    } else {
        logger.error('이번달 베스트 가져오기 에러 : ', monthly)
    }

    if (result.daily || result.weekly || result.monthly) {
        return res.status(200).json(result);
    } else {
        logger.error('기간별 베스트 가져오기 에러 : ', boardType);
        return res.status(500).json({ message: '기간별 베스트를 가져오지 못했습니다.' });
    }
})

router.get('/recent', checkSignin, async (req, res) => {
    let result = await boardModel.getRecentBoards();
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('최근 게시물 설정 게시판 가져오기 에러 : ', result);
        return res.status(500).json({ message: `최근 게시물을 가져오지 못했습니다.[${result.code || ''}]` })
    }
})

router.get('/userId', async (req, res) => {
    if (typeof req.query.userId === 'string') {
        if (req.query.userId.length < 50) {
            if (reserved.includes(req.query.userId) || reservedNickName.includes(req.query.userId)) {
                return res.status(400).json({ target: 'userId', message: '사용할 수 없는 ID입니다.' })
            }
            let check = await userModel.checkUserId(req.query.userId)
            if (Array.isArray(check) && check[0].count === 0) {
                return res.status(200).json({ message: '사용 가능한 ID입니다.' })
            } else {
                return res.status(409).json({ message: '이미 사용중인 ID입니다.' })
            }
        } else {
            return res.status(400).json({ target: 'userId', message: 'ID가 너무 깁니다.(최대 50자)' })
        }
    } else {
        return res.status(400).json({ target: 'userId', message: '체크할 ID를 입력해주세요.' })
    }
})

router.get('/email', async (req, res) => {
    if (typeof req.query.email === 'string') {
        if (req.query.email.length < 100) {
            const email = emailRegex.exec(req.query.email);
            if (email) { //matched email
                let check = await userModel.checkEmail(req.query.email)
                if (Array.isArray(check) && check[0].count === 0) {
                    return res.status(200).json({ message: '사용 가능한 이메일입니다.' })
                } else {
                    return res.status(409).json({ message: '이미 사용중인 이메일입니다.' })
                }
            } else {
                return res.status(400).json({ target: 'email', message: '유효한 이메일 주소가 아니거나, 인증에 사용할 수 없는 이메일주소입니다.' });
            }
        } else {
            return res.status(400).json({ target: 'email', message: '이메일 주소가 너무 깁니다.(최대 100자)' })
        }
    } else {
        return res.status(400).json({ target: 'email', message: '체크할 이메일 주소를 입력해주세요.' })
    }
})

router.get('/nickName', requiredSignin, async (req, res) => {
    let userId = req.userObject.isAdmin ? req.query.userId || req.userObject.userId : req.userObject.userId;
    if (typeof req.query.nickName === 'string') {
        let nickName = req.query.nickName;
        if (nickName.length > 3 && nickName.length < 100) {
            let check = await userModel.checkNickName(userId, nickName)
            if (Array.isArray(check) && check[0].count === 0) {
                return res.status(200).json({ message: '사용 가능한 닉네임/필명입니다.' })
            } else {
                return res.status(409).json({ message: '이미 사용중인 닉네임/필명입니다.' })
            }
        } else {
            return res.status(400).json({ target: 'email', message: '4~50자로 입력해주세요.' })
        }
    } else {
        return res.status(400).json({ target: 'email', message: '체크할 닉네임/필명을 입력해주세요.' })
    }
})

router.get('/boardId', requiredAuth, async (req, res) => {
    if (typeof req.query.boardId === 'string') {
        let boardId = req.query.boardId;
        if (boardId.length > 3 && boardId.length < 16) {
            if (!boardIdRegex[0].test(boardId)) {
                return res.status(400).json({ target: 'boardId', message: '토픽ID의 길이가 너무 길거나, [_, -] 이외의 특수문자가 있습니다.' })
            } else if (!boardIdRegex[1].test(boardId)) {
                return res.status(400).json({ target: 'boardId', message: '토픽ID에 연속된 [_, -]가 있습니다.' })
            }
            let i = 0;
            while (i < reserved.length) {
                if (boardId.indexOf(reserved[i]) >= 0) {
                    return res.status(403).json({ target: 'boardId', message: `토픽ID가 허용되지 않는 문자(${reserved[i]})를 포함합니다.` })
                }
                i++;
            }
            let check = await boardModel.getBoard(boardId);
            if (Array.isArray(check) && check.length === 0) {
                return res.status(200).json({ target: 'boardId', message: '사용 가능한 토픽ID입니다.' })
            } else {
                return res.status(409).json({ target: 'boardId', message: '이미 사용중인 토픽ID입니다.' })
            }
        } else {
            return res.status(400).json({ target: 'boardId', message: '4~15자로 입력해주세요.' })
        }
    } else {
        return res.status(400).json({ target: 'boardId', message: '체크할 토픽ID를 입력해주세요.' })
    }
})

router.get('/:boardId([a-zA-Z]+)', requiredAuth, async (req, res, next) => {
    let boardId = req.params.boardId
    if (boardId === 'loungeBest' || boardId === 'topicBest') {
        let page = req.query.page,
            documentId = req.query.documentId,
            searchQuery = req.query.searchQuery,
            searchTarget = req.query.searchTarget;
        if (typeof page === 'string') {
            page = 1 * page
        }
        if (page === undefined || !Number.isInteger(page) || page < 1) {
            page = 1;
        }
        if (typeof documentId === 'string') {
            documentId = 1 * documentId;
        }
        if (documentId !== undefined && (!Number.isInteger(documentId) || documentId === 0)) {
            documentId = undefined;
        }
        if (typeof searchQuery !== 'string' || !['title', 'contents', 'titleContents'].includes(searchTarget)) {
            searchQuery = undefined;
            searchTarget = undefined;
        }

        let result = await documentModel.getBestDocuments(documentId, boardId === 'loungeBest' ? 'L' : 'T', searchQuery, searchTarget, page);
        if (Array.isArray(result)) {
            return res.status(200).json(result);
        } else {
            logger.error('베스트게시물 목록 조회 중 에러 : ', result, boardId, page, documentId, searchTarget)
            return res.status(500).json({ message: `게시물 목록을 조회하지 못했습니다.[${result.code || ''}]` })
        }
    } else if (typeof boardId === 'number' || reserved.includes(boardId)) {
        next();
        return;
    } else if (typeof boardId === 'string') { //find board
        let board = await boardModel.getBoard(boardId);
        if (Array.isArray(board) && board.length > 0) {
            board = board[0];
            let result = await boardModel.checkUserBoardReadable(req.userObject.userId, boardId);
            if (Array.isArray(result) && result.length > 0 && result[0].count > 0) { //readable
                let page = req.query.page,
                    sortTarget = req.query.sortTarget,
                    documentId = req.query.documentId,
                    searchQuery = req.query.searchQuery,
                    searchTarget = req.query.searchTarget,
                    isAscending = req.query.isAscending,
                    category = req.query.category;
                if (typeof page === 'string') {
                    page = 1 * page
                }
                if (page === undefined || !Number.isInteger(page) || page < 1) {
                    page = 1;
                }
                if (!['viewCount', 'voteCount', 'writeDateTime'].includes(sortTarget)) {
                    sortTarget = undefined;
                }
                if (typeof documentId === 'string') {
                    documentId = 1 * documentId;
                }
                if (documentId !== undefined && (!Number.isInteger(documentId) || documentId === 0)) {
                    documentId = undefined;
                }
                if (typeof isAscending !== 'boolean') {
                    isAscending = false;
                }
                if (typeof searchQuery !== 'string' || !['title', 'contents', 'titleContents'].includes(searchTarget)) {
                    searchQuery = undefined;
                    searchTarget = undefined;
                }
                if (typeof category !== 'string' || category.length > 30) {
                    category = undefined;
                }

                let result = await documentModel.getDocuments(boardId, documentId, searchQuery, searchTarget, sortTarget, isAscending, page, req.userObject.isAdmin, category);
                if (Array.isArray(result)) {
                    return res.status(200).json(result);
                } else {
                    logger.error('게시물 목록 조회 중 에러 : ', result, boardId, page, sortTarget, documentId, searchQuery, searchTarget, isAscending)
                    return res.status(500).json({ message: `게시물 목록을 조회하지 못했습니다.[${result.code || ''}]` })
                }
            } else {
                return res.status(403).json({ target: 'boardId', message: `${boardTypeDomain[board.boardType]}의 게시물을 볼 수 있는 권한이 없습니다.` })
            }
        }
    }
    next();
    return;
});

const getDocument = async (req, res) => {
    let documentId = req.params.documentId;
    let result = await documentModel.getDocument(documentId);
    if (Array.isArray(result) && result.length > 0) {
        const board = await boardModel.getBoard(result[0].boardId);
        if (Array.isArray(board) && board.length > 0 && board[0].status === 'NORMAL') {
            if(!board[0].statusAuth.read.includes(req.userObject.auth)){
                const authString = {
                    'A':'인증',
                    'E':'전직교사',
                    'N':'예비교사',
                    'D':'인증제한'
                }
                return res.status(403).json({ target: 'documentId', message: `게시물을 읽을 수 있는 권한이 없습니다. ${board[0].statusAuth.read.map(x=>authString[x]).filter(x=>x).join(', ')} 회원만 읽기가 가능합니다.` })
            }
            if (board[0].allGroupAuth === 'NONE') {
                const check = await boardModel.checkUserBoardReadable(req.userObject.userId, result[0].boardId);
                if (!Array.isArray(check) || check.length === 0 || check[0].count === 0) {
                    return res.status(403).json({ target: 'documentId', message: '게시물을 읽을 수 있는 권한이 없습니다.' })
                }
            }
            let view = await documentModel.createDocumentViewLog(documentId, req.userObject.userId);
            if (view && view.rows && view.rows.length > 0 && view.rows[0].viewCount > 0) {
                result[0].viewCount = view.rows[0].viewCount;
            }
            if (result[0].hasSurvey) {
                let survey = await documentModel.getDocumentSurvey(documentId);
                if (Array.isArray(survey) && survey.length > 0) {
                    delete survey[0].documentId;
                    result[0].survey = survey[0];
                    let check = await documentModel.getDocumentSurveyHistory(documentId, req.userObject.userId);
                    if (Array.isArray(check) && check.length > 0 && check[0].count > 0) {
                        result[0].participatedSurvey = true;
                    }
                }
            }
            if (result[0].hasAttach) {
                const attach = await documentModel.getDocumentAttach(documentId);
                if (Array.isArray(attach) && attach.length > 0) {
                    result[0].attach = attach;
                }
            }
            if ((result[0].userId === req.userObject.userId) || req.userObject.isAdmin) {
                result[0].isWriter = true;
            }
            delete result[0].userId;
            return res.status(200).json(result[0]);
        } else {
            return res.status(404).json({ target: 'documentId', message: `존재하지 않는 ${board && board[0] && board[0].boardType? boardTypeDomain[board[0].boardType] || '게시판' : '게시판'}입니다.` });
        }
    } else {
        return res.status(404).json({ target: 'documentId', message: '존재하지 않는 게시물입니다.' })
    }
}

router.get('/:boardId([a-zA-Z]+)/:documentId(^[\\d]+$)', requiredSignin, async (req, res, next) => {
    if (typeof req.params.boardId === 'number' || reserved.includes(req.params.boardId)) {
        next();
        return;
    }
    let documentId = req.params.documentId;
    if (!Number.isInteger(documentId)) {
        documentId = 1 * documentId;
        if (isNaN(documentId) || documentId === 0) {
            next();
            return;
        }
    }
    return await getDocument(req, res);
});

router.get(/\/(\d+)(?:\/.*|\?.*)?$/, requiredSignin, async (req, res, next) => {
    let documentId = req.params[0];
    if (!Number.isInteger(documentId)) {
        documentId = 1 * documentId;
        if (isNaN(documentId) || documentId === 0) {
            next();
            return;
        }
    }
    req.params.documentId = documentId;
    return await getDocument(req, res);
});

module.exports = router;
const router = require('express').Router();
const requiredAuth = require('../middlewares/requiredAuth'),
    requiredSignin = require('../middlewares/requiredSignin'),
    adminOnly = require('../middlewares/adminOnly')
const boardModel = require('../models/boardModel'),
    userModel = require('../models/userModel'),
    groupModel = require('../models/groupModel')
const { safeStringLength, moment } = require('../util'),
    logger = require('../logger'), { reserved } = require('../constants'),
    constants = require('../constants');

//based on /board

router.get('/', requiredAuth, async (req, res) => {
    let boardId = req.query.boardId;
    if (!boardId || typeof boardId !== 'string') {
        return res.status(400).json({ target: 'boardId', message: '라운지/토픽을 찾을 수 없습니다.' });
    }
    let board = await boardModel.getBoard(boardId)
    if (Array.isArray(board) && board.length > 0 && board[0].status === 'NORMAL') { //오류, 존재하지 않음, 삭제된 게시판
        board = board[0];
    } else {
        return res.status(404).json({ target: 'boardId', message: '존재하지 않는 라운지/토픽입니다.' });
    }
    let owner = await userModel.getUser(board.ownerId);
    if (Array.isArray(owner) && owner.length > 0) {
        board.owner = board.boardType === 'T' ? owner[0].topicNickName : owner[0].loungeNickName;
    } else {
        board.owner = null;
    }
    if (!req.userObject.isAdmin) {
        delete board.ownerId;
    }
    delete board.status;
    board.boardAuth = await boardModel.getBoardAuthName(board.boardId, req.userObject.isAdmin);

    return res.status(200).json(board);
});

router.put('/', requiredAuth, async (req, res) => {
    let boardId = req.body.boardId;
    if (typeof boardId !== 'string') {
        return res.status(400).json({ target: 'boardId', message: '변경할 라운지/토픽을 찾을 수 없습니다.' })
    }
    const board = await boardModel.getBoard(boardId);
    const immediate = req.userObject.isAdmin ? req.body.immediate : false;
    if (!Array.isArray(board) || board.length < 1) {
        return res.status(404).json({ target: 'boardId', message: '존재하지 않는 라운지/토픽입니다.' });
    } else if (board[0].ownerId !== req.userObject.userId && !req.userObject.isAdmin) {
        return res.status(403).json({ target: 'boardId', message: '라운지/토픽 정보를 변경할 수 있는 권한이 없습니다.' });
    } else if (board[0].reservedContents && !req.body.overwrite && !immediate) {
        return res.status(403).json({ message: `이미 ${moment(board[0].reservedDate, 'YYYYMMDD').format('YYYY년 M월 D일')}에 예약된 변경내용이 존재합니다.` });
    }

    if (!board[0].reservedContents) {
        board[0].reservedContents = {};
    }
    let reservedContents = {};
    if (typeof req.body.boardName === 'string' && req.body.boardName !== '' && safeStringLength(req.body.boardName, 200) !== board[0].boardName) {
        reservedContents.boardName = safeStringLength(req.body.boardName, 200)
    }
    if (typeof req.body.boardDescription === 'string' && safeStringLength(req.body.boardDescription, 1000) !== board[0].boardDescription) {
        reservedContents.boardDescription = safeStringLength(req.body.boardDescription, 1000);
    }
    if (typeof req.body.ownerNickName === 'string') {
        const nextOwner = await userModel.getUserIdByNickName(req.body.ownerNickName, board[0].boardType);
        if (!Array.isArray(nextOwner) || nextOwner.length < 1) {
            return res.status(404).json({ target: 'ownerNickName', message: '존재하지 않는 사용자를 선택하셨습니다.' })
        } else {
            if (nextOwner[0].userId !== board[0].ownerId) {
                let result = await boardModel.checkUserBoardWritable(nextOwner[0].userId, boardId);
                if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
                    return res.status(400).json({ target: 'ownerNickName', message: board[0].boardType === 'T' ? '해당 사용자는 이 토픽을 구독중이지 않거나, 토픽지기로 지정할 수 없는 상태입니다' : '해당 사용자는 이 라운지에 글을 쓸 수 없어 소유자로 지정할 수 없습니다.' })
                }
                reservedContents.ownerId = nextOwner[0].userId
            }
        }
    }
    if (typeof req.body.allowAnonymous === 'boolean' && req.body.allowAnonymous !== board[0].allowAnonymous) {
        reservedContents.allowAnonymous = req.body.allowAnonymous
    }
    if (typeof req.body.useCategory === 'boolean' && req.body.allowAnonymous !== board[0].useCategory) {
        reservedContents.useCategory = req.body.useCategory
    }
    if (typeof req.body.status === 'string' && ['NORMAL', 'DELETED'].indexOf(req.body.status) >= 0 && req.body.status !== board[0].status) {
        reservedContents.status = req.body.status;
    }
    if (typeof req.body.allGroupAuth === 'string' && ['NONE', 'READONLY', 'READWRITE'].indexOf(req.body.allGroupAuth) >= 0 && req.body.allGroupAuth !== board[0].allGroupAuth) {
        reservedContents.allGroupAuth = req.body.allGroupAuth
    }

    let groups = req.body.allowedGroups;
    if (groups) {
        if (!Array.isArray(groups)) {
            groups = [groups];
        }
        reservedContents.auth = [];
        let currentBoardAuth = await boardModel.getBoardAuth(boardId);
        let i = 0,
            result;
        if (Array.isArray(currentBoardAuth)) {
            while (i < groups.length) {
                if (!currentBoardAuth.find(x => x.groupId === groups[i])) { //new group
                    result = await groupModel.getGroup(groups[i]);
                    if (result && result[0] && (result[0].isOpenToUsers || req.userObject.isAdmin)) {
                        reservedContents.auth.push({ groupId: groups[i], authType: 'READONLY', command: 'INSERT' });
                    }
                }
                i++;
            }
            i = 0;
            while (i < currentBoardAuth.length) {
                if (!(groups.find(x => x === currentBoardAuth[i].groupId))) { //deleted group
                    reservedContents.auth.push({ groupId: currentBoardAuth[i].groupId, command: 'DELETE' })
                }
                i++;
            }
        }
        if (reservedContents.auth.length === 0) {
            delete reservedContents.auth;
        }
    }

    if (req.userObject.isAdmin && req.body.categories) {
        let categories = req.body.categories;
        if (!Array.isArray(categories)) {
            categories = [categories];
        }
        reservedContents.categories = [];
        let currentBoardCategory = await boardModel.getBoardCategory(boardId);
        let i = 0;
        if (Array.isArray(currentBoardCategory)) {
            while (i < categories.length) {
                categories[i] = safeStringLength(categories[i], 30);
                if (!currentBoardCategory.some(x => x.categoryName === categories[i])) { //new category
                    reservedContents.categories.push({ category: categories[i], command: 'INSERT' });
                }
                i++;
            }
            i = 0;
            while (i < currentBoardCategory.length) {
                if (!(categories.some(x => x === currentBoardCategory[i].categoryName))) { //deleted category
                    reservedContents.categories.push({ category: currentBoardCategory[i].categoryName, command: 'DELETE' })
                }
                i++;
            }
        }
        if (reservedContents.categories.length === 0) {
            delete reservedContents.categories;
        }
    }

    if (Object.keys(reservedContents).length === 0 && !(req.body.overwrite && Object.keys(board[0].reservedContents).length !== 0)) {
        return res.status(400).json({ message: '변경될 내용이 없습니다. 입력한 값이 올바른지 확인해주세요.' });
    } else {
        let result;
        if (immediate && reservedContents.auth) {
            let i = 0;
            while (i < reservedContents.auth.length) {
                if (reservedContents.auth[i].command === 'INSERT') {
                    boardModel.createBoardAuth(boardId, reservedContents.auth[i].groupId, reservedContents.auth[i].authType)
                } else if (reservedContents.auth[i].command === 'UPDATE') {
                    boardModel.updateBoardAuth(boardId, reservedContents.auth[i].groupId, reservedContents.auth[i].authType)
                } else if (reservedContents.auth[i].command === 'DELETE') {
                    boardModel.deleteBoardAuth(boardId, reservedContents.auth[i].groupId)
                }
                i++;
            }
        }
        if (reservedContents.categories) {
            if (reservedContents.categories.some(x => x.command === 'INSERT')) {
                await boardModel.createBoardCategory(boardId, reservedContents.categories.filter(x => x.command === 'INSERT').map(x => x.category));
            }
            if (reservedContents.categories.some(x => x.command === 'DELETE')) {
                await boardModel.deleteBoardCategory(boardId, reservedContents.categories.filter(x => x.command === 'DELETE').map(x => x.category));
            }
            delete reservedContents.categories;
        }
        if (immediate && Object.keys(reservedContents).filter(x => x !== 'auth').length > 0) {
            result = await boardModel.updateBoard({ boardId: boardId, ...reservedContents });
        } else if (immediate) {
            result = 1;//all done
        } else {//reservedDate : admin이 아니고 예약내용이 존재하지 않으면 null, 예약내용이 존재하면 1달뒤, admin이고 예약내용이 존재하지 않으면 null, 예약내용이 존재하고 예약날짜가 있으면 그 날짜로, 없으면 1달뒤
            const hasContents = Object.keys(reservedContents).length > 0;
            result = await boardModel.updateBoard({ boardId: boardId, reservedDate: (req.userObject.isAdmin ? (hasContents ? (req.body.reservedDate ? req.body.reservedDate.replace(/\-/gi, '') : moment().add(1, 'months').format('YYYYMMDD')) : null) : (hasContents ? moment().add(1, 'months').format('YYYYMMDD') : null)), reservedContents: (Object.keys(reservedContents).length === 0 ? null : reservedContents) });
        }

        if (typeof result === 'object' || result === 0) {
            logger.error('게시판 설정 변경 처리 중 에러 : ', result, req.userObject.userId, reservedContents)
            return res.status(500).json({ message: `변경될 내용을 저장하는 데 실패하였습니다.[${result.code || ''}] 다시 시도해주세요.` });
        } else {
            return res.status(200).json({ message: `정상적으로 변경${immediate ? '' : '예약'}되었습니다.${immediate ? '' : ' 변경 내용은 ' + (req.userObject.isAdmin && req.body.reservedDate ? req.body.reservedDate : moment().add(1, 'months').format('YYYYMMDD')) + '에 반영됩니다.'}` })
        }
    }

});

router.post('/', requiredAuth, async (req, res) => {
    let board = {
        boardId: req.body.boardId,
        boardName: req.body.boardName,
        boardDescription: req.body.boardDescription,
        allowAnonymous: req.body.allowAnonymous,
        useCategory: req.body.useCategory,
        allGroupAuth: req.body.allGroupAuth,
        boardType: req.body.boardType,
        groups: req.body.allowedGroups
    };

    if (!constants.boardTypeDomain.hasOwnProperty(board.boardType) || (board.boardType !== 'T' && !req.userObject.isAdmin)) {
        return res.status(400).json({ target: 'boardType', message: '라운지/토픽 구분값이 올바르지 않습니다.' });
    } else if (typeof board.boardId !== 'string' || board.boardId === '') {
        return res.status(400).json({ target: 'boardId', message: `${constants.boardTypeDomain[board.boardType]} ID가 올바르지 않습니다.` })
    } else if (typeof board.boardName !== 'string' || board.boardName === '') {
        return res.status(400).json({ target: 'boardName', message: `${constants.boardTypeDomain[board.boardType]} 이름은 필수입니다.` });
    } else if (board.boardDescription !== undefined && typeof board.boardDescription !== 'string') {
        return res.status(400).json({ target: 'boardDescription', message: '설명 값이 올바르지 않습니다.' });
    } else if (board.allowAnonymous !== undefined && typeof board.allowAnonymous !== 'boolean') {
        return res.status(400).json({ target: 'allowAnonymous', message: '익명글 허용 여부가 올바르지 않습니다.' })
    } else if (board.useCategory !== undefined && typeof board.useCategory !== 'boolean') {
        return res.status(400).json({ target: 'useCategory', message: '카테고리 사용여부가 올바르지 않습니다.' })
    } else if (!['NONE', 'READONLY', 'READWRITE'].includes(board.allGroupAuth)) {
        return res.status(400).json({ target: 'allGroupAuth', message: '전체 허용 여부 값이 올바르지 않습니다.' });
    } else {
        if (!constants.boardIdRegex[0].test(board.boardId)) {
            return res.status(400).json({ target: 'boardId', message: `${constants.boardTypeDomain[board.boardType]} ID의 길이가 너무 길거나, [_, -] 이외의 특수문자가 있습니다.` })
        } else if (!constants.boardIdRegex[1].test(board.boardId)) {
            return res.status(400).json({ target: 'boardId', message: `${constants.boardTypeDomain[board.boardType]} ID에 연속된 [_, -]가 있습니다.` })
        }
        let i = 0;
        while (i < reserved.length) {
            if (board.boardId.indexOf(reserved[i]) >= 0) {
                return res.status(403).json({ target: 'boardId', message: `${constants.boardTypeDomain[board.boardType]} ID가 허용되지 않는 문자(${reserved[i]})를 포함합니다.` })
            }
            i++;
        }
    }

    let check = await boardModel.getBoard(board.boardId);
    if (Array.isArray(check) && check.length > 0) {
        return res.status(409).json({ target: 'boardId', message: `이미 존재하는 ${constants.boardTypeDomain[board.boardType]} ID입니다.` });
    }
    board.ownerId = req.userObject.isAdmin ? (req.body.ownerId ? req.body.ownerId : req.userObject.userId) : req.userObject.userId;
    let isAdmin = false;
    if (board.ownerId !== req.userObject.userId) {
        check = await userModel.getUser(board.ownerId);
        if (!Array.isArray(check) || check.length === 0) {
            return res.status(404).json({ target: 'ownerId', message: '입력한 소유자 ID에 해당하는 회원ID가 존재하지 않습니다.' })
        }
        isAdmin = check[0].isAdmin;
    } else {
        isAdmin = req.userObject.isAdmin;
    }
    board.boardDescription = safeStringLength(board.boardDescription, 1000);
    board.boardName = safeStringLength(board.boardName, 200);
    let groups = [];
    if (Array.isArray(board.groups)) {
        let i = 0;
        while (i < board.groups.length) {
            if ((typeof board.groups[i].groupId === 'string' || typeof board.groups[i].groupId === 'number') && ['READONLY', 'READWRITE'].includes(board.groups[i].authType)) {
                check = await groupModel.getGroup(board.groups[i].groupId);
                if (Array.isArray(check) && check.length > 0 && (check[0].isOpenToUsers || req.userObject.isAdmin)) {
                    groups.push({ groupId: board.groups[i].groupId, authType: board.groups[i].authType });
                }
            }
            i++;
        }
    }
    if (board.allGroupAuth !== 'READWRITE' && !isAdmin) {//check to owner could join the board
        let userGroups = await groupModel.getUserGroup(board.ownerId);
        if (Array.isArray(userGroups)) {
            if (!groups.some(x => x.authType === 'READWRITE' && userGroups.some(y => y.groupId === x.groupId))) {
                return res.status(400).json({ target: 'groups', message: `내가 구독할 수 없는 ${constants.boardTypeDomain[board.boardType] + (board.boardType === 'T' ? '은' : '는')} 생성할 수 없습니다.` })
            }
        } else {
            return res.status(500).json({ message: `${constants.boardTypeDomain[board.boardType]} 생성에 실패하였습니다.[${userGroups.code || ''}]` })
        }
    }
    check = await boardModel.createBoard(board);
    if (check > 0) {
        if (groups.length > 0) {
            let i = 0;
            while (i < groups.length) {
                await boardModel.createBoardAuth(board.boardId, groups[i].groupId, groups[i].authType);
                i++;
            }
        }
        await boardModel.createUserBoard(board.ownerId, board.boardId);
        if (req.userObject.isAdmin && Array.isArray(req.body.categories) && req.body.categories.length > 0) {
            await boardModel.createBoardCategory(board.boardId, req.body.categories);
        } else if (board.boardType === 'T' && board.useCategory) {
            await boardModel.createBoardCategory(board.boardId, constants.defaultTopicCategories);
        }
        return res.status(200).json({ message: `${constants.boardTypeDomain[board.boardType]}을 만들었습니다.` })
    } else {
        logger.error('게시판 생성 중 에러 : ', check, req.userObject.userId, board)
        return res.status(500).json({ message: `${constants.boardTypeDomain[board.boardType]} 생성에 실패하였습니다.[${check.code}] 잠시 후 다시 시도해주세요.` })
    }
});

router.delete('/:boardId([a-zA-z]+)', adminOnly, async (req, res) => {
    let boardId = req.params.boardId;
    if (typeof boardId !== 'string' || boardId === '') {
        return res.status(400).json({ target: 'boardId', message: '삭제할 게시판 ID값이 없습니다.' });
    }
    let result = await boardModel.deleteBoard(boardId);
    if (typeof result === 'object') {
        logger.error('게시판 삭제 중 에러 : ', result, req.userObject.userId, boardId)
        return res.status(500).json({ message: '게시판을 삭제하는 중에 오류가 발생했습니다.' });
    } else if (result === 0) {
        return res.status(404).json({ target: 'boardId', message: '존재하지 않는 게시판입니다.' });
    } else {
        return res.status(200).json({ message: '게시판을 삭제하였습니다.' });
    }
});

router.get('/list', requiredSignin, async (req, res) => {
    let isAscending, sortTarget, searchTarget, searchQuery, page, boardType;
    if (typeof req.query.isAscending === 'boolean') {
        isAscending = req.query.isAscending;
    }
    if (['boardType', 'boardName'].includes(req.query.sortTarget)) {
        sortTarget = req.query.sortTarget;
    }
    if (['boardName', 'boardId'].includes(req.query.searchTarget)) {
        searchTarget = req.query.searchTarget;
    }
    if (typeof req.query.searchQuery === 'string' && req.query.searchQuery !== '') {
        searchQuery = req.query.searchQuery;
    }
    if (['L', 'T', 'D', 'E'].includes(req.query.boardType)) {
        boardType = req.query.boardType;
    }
    if (Number.isInteger(req.query.page) && req.query.page > 0) {
        page = req.query.page
    }
    let result = await boardModel.getBoards(searchQuery, boardType, page, searchTarget, sortTarget, isAscending, req.userObject.isAdmin);
    if (Array.isArray(result)) {
        if (!req.userObject.isAdmin) {
            result.forEach(x => {
                delete x.status;
                delete x.ownerId;
            })
        }
        return res.status(200).json(result);
    } else {
        logger.error('게시판 리스트 조회 중 에러 : ', result, req.userObject.userId, req.query)
        return res.status(500).json({ message: `정보를 가져오는 도중에 오류가 발생했습니다.[${result.code || ''}]` })
    }
});

const applyReservedContents = async (boardId) => {
    let board = await boardModel.getBoard(boardId);
    if (!Array.isArray(board) || board.length === 0) {
        return 0;
    }
    board = board[0];
    let reservedContents = board.reservedContents;
    if (reservedContents.auth) {
        let i = 0;
        while (i < reservedContents.auth.length) {
            if (reservedContents.auth[i].command === 'INSERT') {
                boardModel.createBoardAuth(boardId, reservedContents.auth[i].groupId, reservedContents.auth[i].authType)
            } else if (reservedContents.auth[i].command === 'UPDATE') {
                boardModel.updateBoardAuth(boardId, reservedContents.auth[i].groupId, reservedContents.auth[i].authType)
            } else if (reservedContents.auth[i].command === 'DELETE') {
                boardModel.deleteBoardAuth(boardId, reservedContents.auth[i].groupId)
            }
            i++;
        }
    }
    reservedContents.boardId = boardId;
    if (Object.keys(reservedContents).filter(x => x !== 'auth').length > 0) {
        let result = await boardModel.updateBoard(reservedContents);
        if (typeof result === 'object' || result === 0) {
            logger.error('board update apply error : ' + result);
            return -1;
        } else {
            return 1;
        }
    } else {
        return 1;
    }
}
module.exports = router;
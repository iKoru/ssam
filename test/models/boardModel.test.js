/* global expect */
const boardModel = require('../../server/models/boardModel'),
    groupModel = require('../../server/models/groupModel');
const util = require('../../server/util');

//test('create board(init)', async (done) => {
// expect(await boardModel.createBoard({
//     boardId: 'free',
//     boardName: '자유게시판',
//     boardDescription: '자유롭게 사용하는 게시판입니다.',
//     boardType: 'L',
//     allowAnonymous: true,
//     ownerId: 'orange',
//     allGroupAuth: 'READONLY'
// })).toEqual(1);
// expect(await boardModel.createBoard({
//     boardId: 'seoul',
//     boardName: '서울게시판',
//     boardDescription: '서울사람들이 자유롭게 사용하는 게시판입니다.',
//     boardType: 'L',
//     allowAnonymous: true,
//     ownerId: 'blue',
//     allGroupAuth: 'READONLY'
// })).toEqual(1);
// expect(await boardModel.createBoard({
//     boardId: 'nofree',
//     boardName: '비자유게시판',
//     boardDescription: '자유롭게 사용하지 않는 게시판입니다.',
//     boardType: 'T',
//     allowAnonymous: true,
//     ownerId: 'orange',
//     allGroupAuth: 'NONE'
// })).toEqual(1);
// done();
//});

test('get boards', async (done) => {
    expect(await boardModel.getBoards('orange')).toHaveLength(0);
    expect(await boardModel.getBoards()).toHaveLength(3);
    expect(await boardModel.getBoards(null, 'L')).toHaveLength(2);
    expect(await boardModel.getBoards(null, 'T')).toHaveLength(1);
    expect(await boardModel.getBoards('비', null)).toHaveLength(1);
    expect(await boardModel.getBoards('자', null)).toHaveLength(2);
    done();
});

test('create board', async (done) => {
    expect(await boardModel.createBoard({
        boardId: 'test',
        boardName: '테스트게시판',
        boardDescription: '테스트 게시판입니다.',
        boardType: 'T',
        allowAnonymous: false,
        ownerId: 'blue',
        allGroupAuth: 'READONLY'
    })).toEqual(1);
    done();
});

test('get board', async (done) => {
    const board = await boardModel.getBoards();
    expect(board.length).toBeGreaterThan(2);
    expect((await boardModel.getBoard(board[0].boardId))[0]).toEqual(board[0]);
    done();
});

test('update board', async (done) => {
    let board = await boardModel.getBoard('test');
    expect(board).toHaveLength(1);
    board = board[0];
    board.boardType = 'L';
    board.allowAnonymous = true;
    board.allGroupAuth = 'NONE';
    board.reservedDate = util.getYYYYMMDD();
    board.reservedContents = JSON.stringify({ boardType: 'T', allowAnonymous: false, allGroupAuth: 'READONLY' });
    expect(await boardModel.updateBoard(board)).toEqual(1);
    let board2 = (await boardModel.getBoard(board.boardId))[0];
    expect(board.allowAnonymous).toEqual(board2.allowAnonymous);
    expect(board.boardType).toEqual(board2.boardType);
    expect(board.allGroupAuth).toEqual(board2.allGroupAuth);
    expect(JSON.parse(board.reservedContents)).toEqual(board2.reservedContents);
    done();
});

test('check board id', async (done) => {
    expect(await boardModel.checkBoardId('document')).toEqual([{ count: 1 }]); //reserved
    expect(await boardModel.checkBoardId('test')).toEqual([{ count: 1 }]); //exists
    expect(await boardModel.checkBoardId('aaa')).toEqual([{ count: 0 }]); //not exists
    done();
});

test('create user board', async (done) => {
    expect(await boardModel.createUserBoard('blue', 'aaa', true)).toEqual(0); //not exists
    expect(await boardModel.createUserBoard('blue', 'test', true)).toEqual(0); //not authorized to enter the board
    expect(await boardModel.createUserBoard('blue', 'free', true)).toEqual(1);
    done();
});

test('delete user board', async (done) => {
    expect(await boardModel.deleteUserBoard('blue', 'free')).toEqual(1);
    done();
});
(async () => {
    const group = await groupModel.getGroups(true, ['N'])[0];
    test('create board auth', async (done) => {
        expect(await boardModel.createBoardAuth('test', group.groupId, 'READONLY'));
        const boardAuth = await boardModel.getBoardAuth('test')
        expect(boardAuth).toHaveLength(1);
        expect(boardAuth[0]).toHaveProperty('AuthType', 'READONLY');
        expect(await groupModel.createUserGroup('blue', group.groupId, true)).toEqual(1);
        expect(await boardModel.createUserBoard('blue', 'test', true)).toEqual(1); //authorized to enter the board
        expect(await boardModel.deleteUserBoard('blue', 'test')).toEqual(1);
        done();
    });

    test('update board auth', async (done) => {
        expect(await boardModel.updateBoardAuth('test', group.groupId, 'READWRITE')).toEqual(1);
        expect(await boardModel.createUserBoard('blue', 'test', true)).toEqual(1); //authorized to enter the board
        expect(await boardModel.deleteUserBoard('blue', 'test')).toEqual(1);
        done();
    });

    test('delete board auth', async (done) => {
        expect(await boardModel.deleteBoardAuth('test', group.groupId)).toEqual(1);
        expect(await boardModel.createUserBoard('blue', 'test', true)).toEqual(0); //unauthorized to enter the board
        done();
    })

})();

test('delete Board', async (done) => {
    expect(await boardModel.deleteBoard('test')).toEqual(1);
    done();
});
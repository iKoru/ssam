const pool = require('./db');

exports.checkBoardId = async(boardId) => {
    //reserved words : document, documents, profile, profiles, auth, user, users, comment, comments, vote, votes, report, reports, index, scraps, scrap, board, boards, manage, manages, chat, chats, message, messages, group, groups, event, events, signup, signin, signout, resetPassword, notification, notifications
}

exports.getBoards = async(searchQuery, boardType, page = 1, searchTarget = "title", sortTarget = "boardName", sortType = "desc") => {

}

exports.getUserBoards = async(userId) => {

}

exports.deleteUserBoard = async(userId, boardId) => {

}

exports.createUserBoard = async(userId, boardId) => {

}

exports.getBoard = async(boardId) => {

}

exports.createBoard = async(board) => {

}

exports.deleteBoard = async(boardId) => {

}

exports.updateBoard = async(board) => {

}
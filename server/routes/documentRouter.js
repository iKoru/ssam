const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin'),
    adminOnly = require('../middlewares/adminOnly');
const boardModel = require('../models/boardModel'),
    documentModel = require('../models/documentModel'),
    util = require('../util'),
    path = require('path'),
    {attachBasePath} = require('../../config'),
    { boardTypeDomain } = require('../constants'),
    logger = require('../logger')
let multerLib = require('multer'),
    multer = multerLib({ dest: attachBasePath + 'attach/', limits: { fileSize: 1024 * 1024 * 8 }, storage: multerLib.diskStorage({ filename: function (req, file, cb) { cb(null, util.UUID() + path.extname(file.originalname)) } }) }).array('attach') //max 8MB)
//based on /document

router.post('/', requiredSignin, async (req, res) => {
    multer(req, res, async function (error) {
        if (error instanceof multerLib.MulterError) {
            switch (error.code) {
                case 'LIMIT_FILE_SIZE':
                    return res.status(400).json({ target: 'attach', message: '첨부파일이 최대 크기 8MB를 초과하였습니다.' });
                case 'LIMIT_PART_COUNT':
                    return res.status(400).json({ target: 'attach', message: '첨부파일이 최대 분할크기를 초과하였습니다.' });
                case 'LIMIT_FILE_COUNT':
                    return res.status(400).json({ target: 'attach', message: '첨부파일의 갯수가 너무 많습니다.' });
                case 'LIMIT_FIELD_KEY':
                    return res.status(400).json({ target: 'attach', message: '파일 이름의 길이가 너무 깁니다. 길이를 짧게 변경해주세요.' })
                case 'LIMIT_FIELD_VALUE':
                    return res.status(400).json({ target: 'attach', message: '파일 필드의 길이가 너무 깁니다. 길이를 짧게 변경해주세요.' })
                case 'LIMIT_FIELD_COUNT':
                    return res.status(400).json({ target: 'attach', message: '파일 필드가 너무 많습니다. 필드 수를 줄여주세요.' })
                case 'LIMIT_UNEXPECTED_FILE':
                    return res.status(400).json({ target: 'attach', message: '업로드할 수 없는 파일 종류입니다.' })
            }
        } else if (error) {
            logger.error('첨부파일 업로드 중 에러!! ', error);
            return res.status(500).json({ target: 'attach', message: `첨부파일을 업로드하는 도중 오류가 발생하였습니다.[${error.message || ''}]` })
        }
        let document = {
            userId: req.userObject.userId,
            boardId: req.body.boardId,
            title: req.body.title,
            contents: req.body.contents,
            isAnonymous: (req.body.isAnonymous === 'true'),
            allowAnonymous: req.body.isAnonymous === 'true' ? true : (req.body.allowAnonymous === 'true'),
            restriction: req.body.restriction,
            survey: req.body.survey,
            category:req.body.category,
            previewContents:req.body.previewContents
        };
        if (typeof document.boardId !== 'string' || document.boardId === '') {
            return res.status(400).json({ target: 'boardId', message: '게시물을 작성할 라운지/토픽을 선택해주세요.' })
        } else if (typeof document.isAnonymous !== 'boolean') {
            return res.status(400).json({ target: 'isAnonymous', message: '익명여부 선택이 올바르지 않습니다.' })
        } else if (typeof document.title !== 'string' || document.title === '') {
            return res.status(400).json({ target: 'title', message: '게시물 제목을 입력해주세요.' })
        } else if (document.title.length > 300) {
            return res.status(400).json({ target: 'title', message: `게시물 제목이 너무 깁니다.(${document.title.length}/300자)` })
        } else if (typeof document.contents !== 'string' || document.contents === '') {
            return res.status(400).json({ target: 'contents', message: '게시물 내용을 입력해주세요.' })
        } else if (typeof document.allowAnonymous !== 'boolean') {
            return res.status(400).json({ target: 'allowAnonymous', message: '익명댓글 허용여부가 올바르지 않습니다.' })
        } else if (document.survey !== undefined && Array.isArray(document.survey)) {
            return res.status(400).json({ target: 'survey', message: '설문조사 내용이 올바르지 않습니다.' })
        } else if(document.category && typeof document.category !== 'string'){
            return res.status(400).json({ target: 'category', message: '카테고리가 올바르지 않습니다.' })
        }
        if (typeof document.restriction === 'string' && document.restriction !== '') {
            try {
                document.restriction = JSON.parse(document.restriction)
            } catch (error) {
                logger.error('게시물 제한조건 파싱 중 에러 : '.document.restriction, error);
                return res.status(400).json({ target: 'restriction', message: '첨부파일 다운로드 조건 형식이 올바르지 않습니다.' })
            }
        }
        if(document.previewContents && document.previewContents.length > 100){
            document.previewContents = document.previewContents.substring(0, 99);
        }
        if(document.category && document.category.length > 30){
            document.category = document.category.substring(0,29);
        }

        let result = await boardModel.getBoard(document.boardId);
        if (Array.isArray(result) && result.length > 0) {
            if (!result[0].statusAuth.write.includes(req.userObject.auth)) {
                const authString = {
                    'A': '인증',
                    'E': '전직교사',
                    'N': '예비교사',
                    'D': '인증제한'
                }
                return res.status(403).json({ target: 'documentId', message: `게시물을 쓸 수 있는 권한이 없습니다. ${result[0].statusAuth.read.map(x => authString[x]).filter(x => x).join(', ')} 회원만 쓰기가 가능합니다.` })
            }
            if (result[0].boardType === 'T') {
                document.userNickName = req.userObject.topicNickName;
            } else {
                document.userNickName = req.userObject.loungeNickName;
            }
            if (!result[0].allowAnonymous) {
                document.isAnonymous = false;
                document.allowAnonymous = false;
            }
        } else {
            return res.status(404).json({ target: 'boardId', message: '존재하지 않는 라운지/토픽입니다.' });
        }

        document.hasAttach = req.files && req.files.length > 0;
        document.reserved1 = req.userObject.auth;
        result = await documentModel.createDocument(document);
        if (result.error || result.rowCount === 0) {
            logger.error('게시물 저장 중 에러 : ', result, document);
            return res.status(500).json({ message: `게시물을 저장하던 도중 오류가 발생했습니다.[${result.code || ''}]` })
        } else {
            req.body.documentId = result.rows[0].documentId;
            let survey = false;
            if (document.survey) {
                try {
                    document.survey = JSON.parse(document.survey);
                    result = await documentModel.createDocumentSurvey(req.body.documentId, document.survey);
                    if (typeof result === 'object' || result === 0) {
                        logger.error('설문조사 등록 중 에러 : ', document.survey, result);
                        survey = true;
                    }
                } catch (error) {
                    logger.error('설문조사 파싱 및 등록 중 에러 : ', document.survey, error);
                    survey = true;
                }
            }
            if (document.hasAttach) {
                result = await util.uploadFile(req.files, 'attach/document', req.body.documentId, documentModel.createDocumentAttach, req.body.documentId);
                return res.status(200).json({ target: 'attach', message: result.status === 200 ? (survey ? '게시물을 등록하였으나, 설문조사를 등록하지 못했습니다.' : '게시물을 등록하였습니다.') : (survey ? '게시물을 등록했으나, 첨부파일과 설문조사를 등록하지 못했습니다.' : '게시물을 등록했으나, 첨부파일을 업로드하지 못했습니다.'), documentId: req.body.documentId });
            } else {
                return res.status(200).json({ message: (survey ? '게시물을 등록하였으나, 설문조사를 등록하지 못했습니다.' : '게시물을 등록하였습니다.'), documentId: req.body.documentId })
            }
        }
    });
});

router.put('/', requiredSignin, async (req, res) => {
    let document = {
        documentId: req.body.documentId,
        isDeleted: req.body.isDeleted,
        title: req.body.title,
        contents: req.body.contents,
        previewContents: req.body.previewContents,
        restriction: req.body.restriction,
        category: req.body.category,
        hasSurvey: req.body.hasSurvey !== undefined ? !!req.body.hasSurvey : undefined
    };
    if (typeof document.documentId === 'string') {
        document.documentId = 1 * document.documentId;
    }
    if (!Number.isInteger(document.documentId) || document.documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '변경할 게시물을 찾을 수 없습니다.' })
    } else if (typeof document.isDeleted !== 'boolean' && document.isDeleted !== undefined) {
        return res.status(400).json({ target: 'isDeleted', message: '삭제여부 값이 올바르지 않습니다.' })
    }

    let original = await documentModel.getDocument(document.documentId)
    if (!Array.isArray(original) || original.length < 1 || (original[0].isDeleted && !req.userObject.isAdmin)) {
        return res.status(404).json({ target: 'documentId', message: '변경할 게시물을 찾지 못했습니다.' })
    } else if (req.userObject.userId !== original[0].userId && !req.userObject.isAdmin) {
        return res.status(403).json({ target: 'documentId', message: '게시물을 변경할 권한이 없습니다.' })
    }
    original = original[0];

    if (!req.userObject.isAdmin) {
        delete document.title;
    } else if (document.title !== undefined && (typeof document.title !== 'string' || document.title.length > 300)) {
        return res.status(400).json({ target: 'title', message: '입력된 제목이 올바르지 않습니다.' })
    }
    if (!document.isDeleted && typeof document.contents !== 'string' || document.contents === '') {
        return res.status(400).json({ target: 'contents', message: '게시물 내용을 입력해주세요.' })
    }
    if (document.contents === original.contents) {
        delete document.contents;
    }
    if(document.category === original.category){
        delete document.category;
    }else if(document.category && document.category.length > 30){
        document.category = document.category.substring(0,29);
    }
    if(document.previewContents === original.previewContents){
        delete document.previewContents;
    }
    if (document.isDeleted === original.isDeleted) {
        delete document.isDeleted;
    }
    if (document.isDeleted) {
        delete document.contents;
    }
    let result;
    if (document.hasSurvey === false && original.hasSurvey && req.userObject.isAdmin) {
        result = await documentModel.deleteDocumentSurvey(document.documentId);
        if (typeof result !== 'object') {
            result = await documentModel.deleteDocumentSurveyHistory(document.documentId)
            if (typeof result === 'object') {
                logger.error('게시물 변경(설문조사 내역 삭제) 중 에러 : ', result, document);
                return res.status(500).json({ target: 'hasSurvey', message: `설문조사 내역을 삭제하는 데 실패하였습니다.[${result.code || ''}]` })
            }
        } else {
            logger.error('게시물 변경(설문조사 삭제) 중 에러 : ', result, document);
            return res.status(500).json({ target: 'hasSurvey', message: `설문조사를 삭제하는 데 실패하였습니다.[${result.code || ''}]` })
        }
    } else {
        delete document.hasSurvey
    }

    result = await documentModel.updateDocument(document);
    if (result > 0) {
        return res.status(200).json({ message: `게시물을 ${document.isDeleted ? '삭제' : '변경'}하였습니다.` });
    } else {
        logger.error('게시물 변경 중 에러 : ', result, document);
        return res.status(500).json({ message: `변경사항을 저장하지 못했습니다.[${result.code || ''}]` })
    }
});

router.delete('/attach/:documentId/:attachId', requiredSignin, async (req, res) => {
    let documentId = req.params.documentId;
    let attachId = req.params.attachId;
    if (typeof documentId === 'string') {
        documentId = 1 * documentId
    }
    if (!Number.isInteger(documentId) || documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '첨부파일을 삭제할 게시물을 찾을 수 없습니다.' })
    } else if (typeof attachId !== 'string') {
        return res.status(400).json({ target: 'attachId', message: '삭제할 첨부파일이 올바르지 않습니다.' })
    }

    let document = await documentModel.getDocument(documentId);
    if (!Array.isArray(document) || document.length < 1) {
        return res.status(404).json({ target: 'documentId', message: '대상 게시물을 찾을 수 없습니다.' })
    } else {
        document = document[0];
        if (document.userId !== req.userObject.userId && !req.userObject.isAdmin) {
            return res.status(403).json({ target: 'documentId', message: '첨부파일을 삭제할 권한이 없습니다.' })
        }
    }

    let attach = await documentModel.getDocumentAttach(documentId, attachId);
    if (!Array.isArray(attach) || attach.length < 1) {
        return res.status(404).json({ target: 'attachId', message: '삭제할 첨부파일을 찾을 수 없습니다.' })
    } else {
        attach = attach[0];
    }

    let result;
    try {
        result = await util.removeUploadedFile(attach.attachPath);
    } catch (error) {
        if (result && result !== 'ENOENT') {
            logger.error('첨부파일 삭제 중 에러 : ', error, documentId);
            return res.status(500).json({ message: `첨부파일을 삭제하지 못했습니다.[${result || ''}]` })
        }
    }
    result = await documentModel.deleteDocumentAttach(documentId, attachId);
    if (typeof result !== 'object') {
        result = await documentModel.getDocumentAttach(documentId);
        if (Array.isArray(result) && result.length === 0) { //no more attachments
            await documentModel.updateDocument({ documentId: documentId, hasAttach: false });
        }
        return res.status(200).json({ message: '첨부파일을 삭제하였습니다.' })
    } else {
        logger.error('첨부파일 삭제 중 에러 : ', result, documentId);
        return res.status(500).json({ message: `첨부파일을 삭제하지 못했습니다.[${result.code || ''}]` })
    }
})

router.delete(/\/(\d+)(?:\/.*|\?.*)?$/, adminOnly, async (req, res) => {
    let documentId = req.params[0];
    if (typeof documentId === 'string') {
        documentId = 1 * documentId;
    }
    if (!Number.isInteger(documentId) || documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '삭제할 게시물을 찾을 수 없습니다.' });
    }
    let result = await documentModel.getDocument(documentId);
    if (Array.isArray(result) && result.length > 0) {
        if ((result[0].userId !== req.userObject.userId) && !req.userObject.isAdmin) {
            return res.status(403).json({ target: 'documentId', message: '게시물을 삭제할 수 있는 권한이 없습니다.' })
        }
        if (result[0].hasSurvey) {
            await documentModel.deleteDocumentSurvey(documentId);
            await documentModel.deleteDocumentSurveyHistory(documentId);
        }
        if (result[0].hasAttach) {
            result = await documentModel.getDocumentAttach(documentId);
            let i = 0,
                err;
            while (i < result.length) {
                err = await util.removeUploadedFile(result[i].attachPath)
                if (err) {
                    logger.error('게시물 삭제에 따른 첨부파일 삭제 에러 : ', result[i].attachPath, err);
                } else {
                    await documentModel.deleteDocumentAttach(documentId, result[i].attachId);
                }
                i++;
            }
        }
        result = await documentModel.deleteDocument(documentId);
        if (typeof result === 'object' || result === 0) {
            logger.error('게시물 삭제 중 에러 : ', result, documentId)
            return res.status(500).json({ message: `게시물을 삭제하는 중에 오류가 발생했습니다.[${result.code || ''}]` });
        } else {
            return res.status(200).json({ message: '게시물을 삭제하였습니다.' });
        }
    } else {
        return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
});

router.post('/attach', requiredSignin, async (req, res) => {
    multer(req, res, async function (error) {
        if (error instanceof multerLib.MulterError) {
            switch (error.code) {
                case 'LIMIT_FILE_SIZE':
                    return res.status(400).json({ target: 'attach', message: '첨부파일이 최대 크기 8MB를 초과하였습니다.' });
                case 'LIMIT_PART_COUNT':
                    return res.status(400).json({ target: 'attach', message: '첨부파일이 최대 분할크기를 초과하였습니다.' });
                case 'LIMIT_FILE_COUNT':
                    return res.status(400).json({ target: 'attach', message: '첨부파일의 갯수가 너무 많습니다.' });
                case 'LIMIT_FIELD_KEY':
                    return res.status(400).json({ target: 'attach', message: '파일 이름의 길이가 너무 깁니다. 길이를 짧게 변경해주세요.' })
                case 'LIMIT_FIELD_VALUE':
                    return res.status(400).json({ target: 'attach', message: '파일 필드의 길이가 너무 깁니다. 길이를 짧게 변경해주세요.' })
                case 'LIMIT_FIELD_COUNT':
                    return res.status(400).json({ target: 'attach', message: '파일 필드가 너무 많습니다. 필드 수를 줄여주세요.' })
                case 'LIMIT_UNEXPECTED_FILE':
                    return res.status(400).json({ target: 'attach', message: '업로드할 수 없는 파일 종류입니다.' })
            }
        } else if (error) {
            logger.error('첨부파일 업로드 중 에러!! ', error);
            return res.status(500).json({ target: 'attach', message: `첨부파일을 업로드하는 도중 오류가 발생하였습니다.[${error.message || ''}]` })
        }
        let documentId = req.body.documentId;
        if (typeof documentId === 'string') {
            documentId = 1 * documentId
        }
        if (!Number.isInteger(documentId) || documentId === 0) {
            return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' })
        }
        if (!Array.isArray(req.files) || req.files.length < 1) {
            return res.status(400).json({ target: 'files', message: '첨부파일을 올려주세요.' })
        }
        let document = await documentModel.getDocument(documentId);
        if (Array.isArray(document) && document.length > 0) {
            if ((document[0].userId === req.userObject.userId) || req.userObject.isAdmin) {
                const result = await util.uploadFile(req.files, 'attach/document', documentId, documentModel.createDocumentAttach, documentId);
                if (result.status === 200 && !document[0].hasAttach) {
                    await documentModel.updateDocument({ documentId: documentId, hasAttach: true });
                }
                if (result.status === 500) {
                    logger.error('첨부파일 등록 중 에러 : ', result, documentId)
                }
                return res.status(result.status).json({ message: result.message });
            } else {
                return res.status(403).json({ target: 'documentId', message: '첨부파일을 올릴 수 있는 권한이 없습니다.' })
            }
        } else {
            return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' })
        }
    });
});

router.get('/', requiredSignin, async (req, res) => {
    //search document list
    let { boardId, searchQuery, searchTarget, page, targetYear } = req.query;
    if (typeof page === 'string') {
        page = 1 * page
    }
    if (typeof targetYear === 'string') {
        targetYear = 1 * targetYear;
    }
    if (page !== undefined && !Number.isInteger(page) || page === 0) {
        return res.status(400).json({ target: 'page', message: '게시물을 찾을 수 없습니다.' });
    } else if (page < 1 || page === undefined) {
        page = 1;
    }
    if (!['title', 'contents', 'titleContents'].includes(searchTarget)) {
        return res.status(400).json({ target: 'searchTarget', message: '검색할 대상을 선택해주세요.' })
    }

    let board, result;
    if (boardId) {
        board = await boardModel.getBoard(boardId);
        if (Array.isArray(board) && board.length > 0 && board[0].status !== 'DELETED') {
            board = board[0];
            if (!board.statusAuth.read.includes(req.userObject.auth)) {
                const authString = {
                    'A': '인증',
                    'E': '전직교사',
                    'N': '예비교사',
                    'D': '인증제한'
                }
                return res.status(403).json({ target: 'documentId', message: `게시물을 볼 수 있는 권한이 없습니다. ${board.statusAuth.read.map(x => authString[x]).filter(x => x).join(', ')} 회원만 조회가 가능합니다.` })
            }
        } else {
            return res.status(404).json({ target: 'boardId', message: '존재하지 않는 게시판입니다.' })
        }
        result = await boardModel.checkUserBoardReadable(req.userObject.userId, boardId);
        if (Array.isArray(result) && result.length > 0 && result[0].count > 0) { //readable
            if (!board.parentBoardId) {//childBoard check
                const boards = await boardModel.getBoards();
                if (boards.some(x => x.parentBoardId === boardId)) {
                    boardId = boards.filter(x => x.parentBoardId === boardId && x.status !== 'DELETED').map(x => x.boardId)
                }
            }
        } else {
            return res.status(403).json({ target: 'boardId', message: `${boardTypeDomain[board.boardType]}의 게시물을 볼 수 있는 권한이 없습니다.`, needSubscription: Array.isArray(result) && result.length > 0 ? result[0].needSubscription : undefined })
        }
    } else {//all open board
        const boards = await boardModel.getBoards();
        boardId = boards.filter(x => x.allGroupAuth !== 'NONE' && !x.parentBoardId && x.statusAuth.read.includes(req.userObject.auth) && x.status !== 'DELETED').map(x => x.boardId)
    }

    if (!boardId || !Array.isArray(boardId) || boardId.length === 0) {
        return res.status(400).json({ message: '검색할 게시판을 찾을 수 없습니다.', target: 'boardId' })
    }
    result = await documentModel.getDocuments(boardId, null, searchQuery, searchTarget, null, false, page, false, null, targetYear, 10);
    if (Array.isArray(result)) {
        return res.status(200).json(result);
    } else {
        logger.error('게시물 검색 중 에러 : ', result, boardId, searchQuery, searchTarget, page, req.userObject.userId);
        return res.status(500).json({ message: '게시물을 찾지 못했습니다. 잠시 후 다시 시도해주세요.' })
    }
})
module.exports = router;
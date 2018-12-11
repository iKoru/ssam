const router = require('express').Router();
const requiredAuth = require('../middlewares/requiredAuth'),
    adminOnly = require('../middlewares/adminOnly');
const boardModel = require('../models/boardModel'),
    documentModel = require('../models/documentModel'),
    util = require('../util'),
    path = require('path'),
    logger = require('../logger'),
    multer = require('multer')({ dest: 'attach/', limits: { fileSize: 1024 * 1024 * 4 }, filename: function(req, file, cb) { cb(null, util.UUID() + path.extname(file.originalname)) } }) //max 4MB
    //based on /document

router.post('/', requiredAuth, multer.array('attach'), async(req, res) => {
    let document = {
        userId: req.userObject.userId,
        boardId: req.body.boardId,
        title: req.body.title,
        contents: req.body.contents,
        isAnonymous: req.body.isAnonymous,
        allowAnonymous: req.body.isAnonymous === true ? true : req.body.allowAnonymous,
        restriction: req.body.restriction,
        survey: req.body.survey
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
    }

    let result = await boardModel.getBoard(document.boardId);
    if (Array.isArray(result) && result.length > 0) {
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

    document.attach = req.files && req.files.length > 0;
    result = await documentModel.createDocument(document);
    if (result.error || result.rowCount === 0) {
        logger.error('게시물 저장 중 에러 : ', result, document);
        return res.status(500).json({ message: `게시물을 저장하던 도중 오류가 발생했습니다.[${result.code || ''}]` })
    } else {
        req.body.documentId = result.rows[0].documentId;
        if (document.survey) {
            result = await documentModel.createDocumentSurvey(document.documentId, document.survey);
            if (typeof result === 'object' || result === 0) {
                return res.status(200).json({ target: 'survey', message: '게시물을 등록하였으나, 설문조사를 등록하지 못했습니다.' });
            }
        }
        if (document.attach) {
            result = await util.uploadFile(req.files, 'attach', document.documentId, documentModel.createDocumentAttach);
            return res.status(200).json({ target: 'attach', message: result.status === 200 ? '게시물을 등록하였습니다.' : '게시물을 등록하였으나, 첨부파일을 업로드하지 못했습니다.', documentId: req.body.documentId });
        } else {
            return res.status(200).json({ message: '게시물을 등록하였습니다.', documentId: req.body.documentId })
        }
    }
});

router.put('/', requiredAuth, async(req, res) => {
    let document = {
        documentId: req.body.documentId,
        isDeleted: req.body.isDeleted,
        title: req.body.title,
        contents: req.body.contents,
        restriction: req.body.restriction,
        hasSurvey: req.body.hasSurvey !== undefined ? !!req.body.hasSurvey : undefined
    };
    if (typeof document.documentId === 'string') {
        document.documentId = 1*document.documentId;
    }
    if (!Number.isInteger(document.documentId) || document.documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '변경할 게시물을 찾을 수 없습니다.' })
    } else if (typeof document.isDeleted !== 'boolean' && document.isDeleted !== undefined) {
        return res.status(400).json({ target: 'isDeleted', message: '삭제여부 값이 올바르지 않습니다.' })
    }

    let original = await documentModel.getDocument(document.documentId)
    if (!Array.isArray(original) || original.length < 1) {
        return res.status(404).json({ target: 'documentId', message: '변경할 게시물을 찾지 못했습니다.' })
    } else if (original[0].isDeleted && !req.userObject.isAdmin) {
        return res.status(404).json({ target: 'documentId', message: '이미 삭제된 게시물입니다.' })
    } else if (req.userObject.userId !== original[0].userId && !req.userObject.isAdmin) {
        return res.status(403).json({ target: 'documentId', message: '게시물을 변경할 권한이 없습니다.' })
    }
    original = original[0];

    if (!req.userObject.isAdmin) {
        delete document.title;
    } else if (typeof document.title !== 'string' || document.title.length > 300) {
        return res.status(400).json({ target: 'title', message: '입력된 제목이 올바르지 않습니다.' })
    }
    if (typeof document.contents !== 'string' || document.contents === '') {
        return res.status(400).json({ target: 'contents', message: '게시물 내용을 입력해주세요.' })
    }

    if (document.contents === original.contents) {
        delete document.contents;
    }
    if (document.isDeleted === original.isDeleted) {
        delete document.isDeleted;
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
        return res.status(200).json({ message: `게시물을 ${document.isDeleted?'삭제':'변경'}하였습니다.` });
    } else {
        logger.error('게시물 변경 중 에러 : ', result, document);
        return res.status(500).json({ message: `변경사항을 저장하지 못했습니다.[${result.code || ''}]` })
    }
});

router.delete(/\/(\d+)(?:\/.*|\?.*)?$/, adminOnly, async(req, res) => {
    let documentId = req.params[0];
    if (typeof documentId === 'string') {
        documentId = 1*documentId;
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
                err = await util.unlink(result[i].attachPath)
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

router.post('/attach', requiredAuth, multer.array('attach'), async(req, res) => {
    let documentId = req.body.documentId;
    if (typeof documentId === 'string') {
        documentId = 1*documentId
    }
    if (!Number.isInteger(documentId) || documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' })
    }
    let document = await documentModel.getDocument(documentId);
    if (!Array.isArray(req.files) || req.files.length < 1) {
        return res.status(400).json({ target: 'files', message: '첨부파일을 올려주세요.' })
    }
    if (Array.isArray(document) && document.length > 0) {
        if ((document[0].userId === req.userObject.userId) || req.userObject.isAdmin) {
            const result = await util.uploadFile(req.files, 'attach', documentId, documentModel.createDocumentAttach);
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

router.delete('/attach/:documentId(^[\\d]+$)/:attachId', requiredAuth, async(req, res) => {
    let documentId = req.params.documentId;
    let attachId = req.params.attachId;
    if (typeof documentId === 'string') {
        documentId = 1*documentId
    }
    if (!Number.isInteger(documentId) || documentId === 0) {
        return res.status(400).json({ target: 'documentId', message: '삭제할 게시물을 찾을 수 없습니다.' })
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
    result = await util.unlink(attach.attachPath);
    if (result && result !== 'ENOENT') {
        logger.error('첨부파일 삭제 중 에러 : ', result, documentId);
        return res.status(500).json({ message: `첨부파일을 삭제하지 못했습니다.[${result || ''}]` })
    } else {
        let result = await documentModel.deleteDocumentAttach(documentId, attachId);
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
    }
})
module.exports = router;
const router = require('express').Router();
const requiredAuth = require('../middlewares/requiredAuth'),
    adminOnly = require('../middlewares/adminOnly');
const boardModel = require('../models/boardModel'),
    documentModel = require('../models/documentModel'),
    util = require('../util'),
    path = require('path'),
    fs = require('fs'),
    multer = require('multer')({ dest: 'attach/', limits: { fileSize: 1024 * 1024 * 4 }, filename: function(req, file, cb) { cb(null, util.UUID() + path.extname(file.originalname)) } }) //max 4MB
    //based on /document

router.post('/', requiredAuth, multer.array('attach'), async(req, res) => {
    let document = {...req.body };
    if (typeof document.boardId !== 'string' || document.boardId === '') {
        return res.status(400).json({ taget: 'boardId', message: '게시물을 작성할 라운지/토픽을 선택해주세요.' })
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
    }

    let result = await boardModel.getBoard(document.boardId);
    if (Array.isArray(result) && result > 0) {
        if (result[0].boardType === 'T') {
            document.userNickName = req.userObject.topicNickName;
        } else {
            document.userNickName = req.userObject.loungeNickName;
        }
    } else {
        return res.status(404).json({ target: 'boardId', message: '존재하지 않는 라운지/토픽입니다.' });
    }

    document.userId = req.userObject.userId;
    result = await documentModel.createDocument(document);
    if (result.error || result.rowCount === 0) {
        return res.status(500).json({ message: `게시물을 저장하던 도중 오류가 발생했습니다.[${result.code}]` })
    } else {
        req.body.documentId = result.rows[0].documentId;
        if (req.files && req.files.length > 0) {
            result = await util.uploadFile(req.files, 'attach', documentId, documentModel.createDocumentAttach);
            return res.status(result.status).json({ message: result.status === 200 ? '게시물을 등록하였습니다.' : '게시물을 등록하였으나, 첨부파일을 업로드하지 못했습니다.', documentId: req.body.documentId });
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
        restriction: req.body.restriction
    };
    if (typeof document.documentId !== 'string' && typeof document.documentId !== 'number') {
        return res.status(400).json({ target: 'documentId', message: '변경할 게시물을 찾을 수 없습니다.' })
    } else if (typeof document.isDeleted !== 'boolean' && document.isDeleted !== undefined) {
        return res.status(400).json({ target: 'isDeleted', message: '삭제여부 값이 올바르지 않습니다.' })
    }
    let original = await documentModel.getDocument(document.documentId)
    if (!Array.isArray(original) || original.length < 1) {
        return res.status(404).json({ target: 'documentId', message: '변경할 게시물을 찾지 못했습니다.' })
    } else if (original[0].isDeleted && !req.userObject.isAdmin) {
        return res.status(404).json({ taget: 'documentId', message: '이미 삭제된 게시물입니다.' })
    } else if (req.userObject.userId !== original[0].userId && !req.userObject.isAdmin) {
        return res.status(403).json({ target: 'documentId', message: '게시물을 변경할 권한이 없습니다.' })
    }
    original = original[0];

    if (!req.userObject.isAdmin) {
        delete document.title;
    } else if (typeof document.title !== 'string' || document.title.length > 300) {
        return res.status(400).json({ target: 'title', message: '입력된 제목이 올바르지 않습니다.' })
    } else if (typeof document.contents !== 'string' || document.contents === '') {
        return res.status(400).json({ target: 'contents', message: '게시물 내용을 입력해주세요.' })
    }

    if (document.contents === original.contents) {
        delete document.contents;
    }
    if (document.isDeleted === original.isDeleted) {
        delete document.isDeleted;
    }

    let result = await documentModel.updateDocument(document);
    if (result > 0) {
        return res.status(200).json({ message: '게시물을 변경하였습니다.' });
    } else {
        return res.status(500).json({ message: `변경사항을 저장하지 못했습니다.[${result.code}]` })
    }
});

router.delete('/:documentId(^[\\d]+$)', adminOnly, async(req, res) => {
    let documentId = req.params.documentId;
    if ((typeof documentId !== 'string' && typeof documentId !== 'number') || documentId === '') {
        return res.status(400).json({ target: 'documentId', message: '요청을 수행하기 위해 필요한 정보가 없거나 올바르지 않습니다.' });
    }
    let result = await documentModel.deleteDocument(documentId);
    if (typeof result === 'object' || result === 0) {
        return res.status(500).json({ message: '게시물을 삭제하는 중에 오류가 발생했습니다.' });
    } else {
        return res.status(200).json({ message: '게시물을 삭제하였습니다.' });
    }
});

router.post('/attach', requiredAuth, multer.array('attach'), async(req, res) => {
    let documentId = req.body.documentId;
    let document = await documentModel.getDocument(documentId);
    if (!Array.isArray(req.files) || req.files.length < 1) {
        return res.status(400).json({ target: 'files', message: '첨부파일을 올려주세요.' })
    }
    if (Array.isArray(document) && document.length > 0) {
        if ((document[0].userId === req.userObject.userId) || req.userObject.isAdmin) {
            const result = await util.uploadFile(req.files, 'attach', documentId, documentModel.createDocumentAttach);
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
    if (typeof documentId !== 'string' && typeof documentId !== 'number') {
        return res.status(400).json({ target: 'documentId', message: '대상 게시물을 찾을 수 없습니다.' })
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
        return res.status(500).json({ message: `첨부파일을 삭제하지 못했습니다.[${result.code}]` })
    } else {
        let result = await documentModel.deleteDocumentAttach(documentId, attachId);
        if (typeof result !== 'object') {
            return res.status(200).json({ message: '첨부파일을 삭제하였습니다.' })
        } else {
            return res.status(500).json({ message: `첨부파일을 삭제하지 못했습니다.[${result.code}]` })
        }
    }
})
module.exports = router;
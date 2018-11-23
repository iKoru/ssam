const router = require('express').Router();
const requiredAuth = require('../middlewares/requiredAuth'),
    adminOnly = require('../middlewares/adminOnly');
//based on /document

router.post('/', requiredAuth, async(req, res) => {
    res.status(501).end();
});

router.put('/', requiredAuth, async(req, res) => {
    res.status(501).end();
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
module.exports = router;
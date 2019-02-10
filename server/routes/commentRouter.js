const router = require('express').Router();
const requiredSignin = require('../middlewares/requiredSignin'),
  adminOnly = require('../middlewares/adminOnly'),
  logger = require('../logger'),
  path = require('path'),
  util = require('../util'),
  { dbErrorCode, commentNotificationTemplate, childCommentNotificationTemplate, boardTypeDomain } = require('../constants');
const commentModel = require('../models/commentModel'),
  documentModel = require('../models/documentModel'),
  boardModel = require('../models/boardModel'),
  notificationModel = require('../models/notificationModel')
let multerLib = require('multer');
let multer = multerLib({ dest: 'attach/', limits: { fileSize: 1024 * 1024 * 8 }, storage: multerLib.diskStorage({ filename: function (req, file, cb) { cb(null, util.UUID() + path.extname(file.originalname)) } }) }).array('attach') //max 8MB)
//based on /comment

router.get('/', requiredSignin, async (req, res) => {
  let documentId = req.query.documentId,
    page = req.query.page;
  if (typeof documentId === 'string') {
    documentId = 1 * documentId
  }
  if (!Number.isInteger(documentId) || documentId === 0) {
    return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
  }
  if (typeof page === 'string') {
    page = 1 * page
  }
  if (page !== undefined && !Number.isInteger(page) || page === 0) {
    return res.status(400).json({ target: 'page', message: '댓글 페이지가 올바르지 않습니다.' });
  } else if (page < 1 || page === undefined) {
    page = 1;
  }
  let result = await documentModel.getDocument(documentId);
  if (Array.isArray(result) && result.length > 0) {
    if(result[0].isDeleted && !req.userObject.isAdmin){
      return res.status(200).json([]);
    }
    result = await boardModel.getBoard(result[0].boardId)
    if (Array.isArray(result) && result.length > 0 && result[0].status === 'NORMAL') {
      if (!result[0].statusAuth.read.includes(req.userObject.auth)) {
        const authString = {
          'A': '인증',
          'E': '전직교사',
          'N': '예비교사',
          'D': '인증제한'
        }
        return res.status(403).json({ target: 'documentId', message: `댓글을 볼 수 있는 권한이 없습니다. ${result[0].statusAuth.comment.map(x => authString[x]).filter(x => x).join(', ')} 회원만 읽기가 가능합니다.` })
      }
    } else {
      return res.status(404).json({ target: 'documentId', message: `존재하지 않는 ${result && result[0] && result[0].boardType ? boardTypeDomain[result[0].boardType] || '게시판' : '게시판'}입니다.` });
    }
    result = await boardModel.checkUserBoardReadable(req.userObject.userId, result[0].boardId);
    if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
      return res.status(403).json({ target: 'documentId', message: '댓글을 볼 수 있는 권한이 없습니다.' })
    }
  } else {
    return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' })
  }
  result = await commentModel.getComments(documentId, page);
  if (Array.isArray(result)) {
    let i = 0;
    let child = await commentModel.getChildCommentsByDocumentId(documentId);
    if (!Array.isArray(child)) {
      logger.error('답글 가져오기 중 에러 : ', child, documentId);
      child = []
    }
    while (i < result.length) {
      if (result[i].userId === req.userObject.userId || req.userObject.isAdmin) {
        result[i].isWriter = true;
      }
      delete result[i].userId;
      delete result[i].documentId;
      delete result[i].reserved1;
      delete result[i].reserved2;
      delete result[i].reserved3;
      delete result[i].reserved4;
      if (result[i].childCount > 0) {
        result[i].children = child.filter(x => x.parentCommentId === result[i].commentId).map(x => {
          if (x.userId === req.userObject.userId || req.userObject.isAdmin) {
            x.isWriter = true;
          }
          delete x.userId;
          return x;
        });
      }
      i++;
    }
    return res.status(200).json(result);
  } else {
    logger.error('댓글 가져오기 에러 : ', result, documentId, page)
    return res.status(500).json({ message: `댓글을 가져오지 못했습니다.[${result.code || ''}]` });
  }
});

router.post('/', requiredSignin, async (req, res) => {
  multer(req, res, async function(error){
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
    let comment = {
      documentId: req.body.documentId,
      parentCommentId: req.body.parentCommentId,
      contents: req.body.contents,
      isAnonymous: (req.body.isAnonymous === 'true'),
      userId: req.userObject.userId
    };
    if (typeof comment.documentId === 'string') {
      comment.documentId = 1 * comment.documentId
    }
    if (!Number.isInteger(comment.documentId) || comment.documentId === 0) {
      return res.status(400).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    }
    if (typeof comment.parentCommentId === 'string') {
      comment.parentCommentId = 1 * comment.parentCommentId
    }
    if (comment.parentCommentId !== undefined && (!Number.isInteger(comment.parentCommentId) || comment.parentCommentId === 0)) {
      return res.status(400).json({ target: 'parentCommentId', message: '상위 댓글을 찾을 수 없습니다.' });
    }
    if (typeof comment.isAnonymous !== 'boolean') {
      return res.status(400).json({ target: 'isAnonymous', message: '익명여부 값을 입력해주세요.' });
    }
    if (!comment.contents) {
      return res.status(400).json({ target: 'contents', message: '댓글 내용을 입력해주세요.' })
    }
  
    const document = await documentModel.getDocument(comment.documentId);
    if (!Array.isArray(document) || document.length === 0) {
      return res.status(404).json({ target: 'documentId', message: '게시물을 찾을 수 없습니다.' });
    } else if (document[0].isDeleted) {
      return res.status(403).json({ target: 'documentId', message: '삭제된 게시물에는 댓글을 작성할 수 없습니다.' })
    } else if (!document[0].allowAnonymous) {
      comment.isAnonymous = false;
    }
  
    let result = await boardModel.getBoard(document[0].boardId);
    if (!Array.isArray(result) || result.length === 0) {
      logger.error('댓글 등록 처리에 게시판 가져오기 중 에러 : ', result, document[0].boardId)
      return res.status(404).json({ target: 'documentId', message: '라운지/토픽을 찾을 수 없습니다.' });
    }
    if (!comment.isAnonymous) {
      comment.userNickName = result[0].boardType === 'T' ? req.userObject.topicNickName : req.userObject.loungeNickName
    }
    if (!req.userObject.isAdmin) {
      if (!result[0].statusAuth.comment.includes(req.userObject.auth)) {
        const authString = {
          'A': '인증',
          'E': '전직교사',
          'N': '예비교사',
          'D': '인증제한'
        }
        return res.status(403).json({ target: 'documentId', message: `댓글을 쓸 수 있는 권한이 없습니다. ${result[0].statusAuth.comment.map(x => authString[x]).filter(x => x).join(', ')} 회원만 댓글 쓰기가 가능합니다.` })
      }
      result = await boardModel.checkUserBoardWritable(req.userObject.userId, document[0].boardId)
      if (!Array.isArray(result) || result.length === 0 || result[0].count === 0) {
        return res.status(403).json({ target: 'documentId', message: '댓글을 쓸 수 있는 권한이 없습니다.' });
      }
    }
    let parentComment;
    if (comment.parentCommentId) {
      parentComment = await commentModel.getComment(comment.parentCommentId);
      if (Array.isArray(parentComment) && parentComment.length > 0) {
        if (parentComment[0].isDeleted) {
          return res.status(400).json({ target: 'parentCommentId', message: '삭제된 댓글에는 대댓글을 작성할 수 없습니다.' })
        }
      } else {
        return res.status(404).json({ target: 'parentCommentId', message: '대댓글을 작성할 댓글을 찾을 수 없습니다.' })
      }
    }
    comment.hasAttach = req.files && req.files.length > 0;
    comment.reserved1 = req.userObject.auth;
    result = await commentModel.createComment(comment);
    if (result.rowCount > 0 && result.rows && result.rows.length > 0 && result.rows[0].commentId > 0) {
      const commentId = result.rows[0].commentId;
      if (comment.hasAttach) {
        result = await util.uploadFile(req.files, 'attachComment', commentId, commentModel.createCommentAttach, commentId);
        res.status(200).json({ target: 'attach', message: result.status === 200 ? '게시물을 등록하였습니다.' : '댓글을 등록했으나, 첨부파일을 업로드하지 못했습니다.', commentId: commentId });
      } else {
        res.status(200).json({ message: '댓글을 등록하였습니다.', commentId: commentId });
      }
      if (comment.parentCommentId) {//알림 대상 : 대댓글
        if (parentComment[0].userId !== req.userObject.userId) {//자기 댓글에 자기가 대댓글 작성하면 알림 없음
          let noti = await notificationModel.getNotifications(parentComment[0].userId, null, 'CC', parentComment[0].commentId);
          if (Array.isArray(noti)) {
            if (noti.length > 0 && !noti[0].isRead) {//update 대상
              await notificationModel.updateNotification({
                notificationId: noti[0].notificationId,
                variable1: (1 * noti[0].variable1) + 1
              })
            } else {//insert 대상
              await notificationModel.createNotification({
                userId: parentComment[0].userId,
                type: 'CC',
                template: childCommentNotificationTemplate,
                variable1: 1,
                variable2: null,
                variable3: null,
                variable4: null,
                target: parentComment[0].commentId,
                href: '/' + document[0].boardId + '/' + document[0].documentId
              })
            }
          } else {
            logger.error('대댓글 알림내역 가져오기 중 에러 : ', noti, parentComment[0].commentId);
          }
        }
      } else {//알림 대상 : 댓글
        if (document[0].userId !== req.userObject.userId) {//자기 글에 자기가 댓글 작성하면 알림 없음
          let noti = await notificationModel.getNotifications(document[0].userId, null, 'DC', document[0].documentId);
          if (Array.isArray(noti)) {
            if (noti.length > 0 && !noti[0].isRead) {//update 대상
              await notificationModel.updateNotification({
                notificationId: noti[0].notificationId,
                variable1: (1 * noti[0].variable1) + 1
              })
            } else {//insert 대상
              await notificationModel.createNotification({
                userId: document[0].userId,
                type: 'DC',
                template: commentNotificationTemplate,
                variable1: 1,
                variable2: null,
                variable3: null,
                variable4: null,
                target: document[0].documentId,
                href: '/' + document[0].boardId + '/' + document[0].documentId
              })
            }
          } else {
            logger.error('댓글 알림내역 가져오기 중 에러 : ', noti, document[0].documentId);
          }
        }
      }
      return;
    } else {
      logger.error('댓글 등록 중 에러 : ', result, comment);
      return res.status(500).json({ message: `댓글을 등록하지 못했습니다.[${result.code || ''}]` });
    }
  })
});

router.put('/', requiredSignin, async (req, res) => {
  let comment = {
    commentId: req.body.commentId,
    contents: req.body.contents,
    isDeleted: req.body.isDeleted,
    userId: req.userObject.userId
  }
  if (typeof comment.commentId === 'string') {
    comment.commentId = 1 * comment.commentId
  }
  if (!Number.isInteger(comment.commentId) || comment.commentId === 0) {
    return res.status(400).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
  }
  if (comment.isDeleted !== undefined && typeof comment.isDeleted !== 'boolean') {
    return res.status(400).json({ target: 'isDeleted', message: '삭제여부 값이 올바르지 않습니다.' });
  }

  let result = await commentModel.getComment(comment.commentId);
  if (Array.isArray(result) && result.length > 0) {
    if (result[0].isDeleted && !req.userObject.isAdmin) {
      return res.status(400).json({ target: 'commentId', message: '삭제된 댓글입니다.' })
    } else if (result[0].userId !== req.userObject.userId && !req.userObject.isAdmin) {
      return res.status(403).json({ target: 'commentId', message: '댓글을 수정할 수 있는 권한이 없습니다.' })
    }
    if (comment.contents === result[0].contents) {
      delete comment.contents;
    }
    if (comment.isDeleted === result[0].isDeleted) {
      delete comment.isDeleted;
    }
    if (comment.isDeleted) {
      delete comment.contents;
    }
    if ((comment.contents === undefined) && (comment.isDeleted === undefined)) {
      return res.status(400).json({ message: '수정할 내역이 없습니다.' });
    }
  } else {
    return res.status(404).json({ target: 'commentId', message: '수정할 댓글이 존재하지 않습니다.' })
  }

  result = await commentModel.updateComment(comment);
  if (result > 0) {
    return res.status(200).json({ message: `댓글을 ${comment.isDeleted ? '삭제' : '수정'}하였습니다.` })
  } else {
    logger.error('댓글 수정 중 에러 : ', result, req.userObject.userId, comment)
    return res.status(500).json({ message: `댓글을 수정하지 못했습니다.[${result.code || ''}]` })
  }
});

router.delete('/attach/:commentId/:attachId', requiredSignin, async (req, res) => {
  let commentId = req.params.commentId;
  let attachId = req.params.attachId;
  if (typeof commentId === 'string') {
    commentId = 1 * commentId
  }
  if (!Number.isInteger(commentId) || commentId === 0) {
    return res.status(400).json({ target: 'commentId', message: '첨부파일을 삭제할 댓글을 찾을 수 없습니다.' })
  } else if (typeof attachId !== 'string') {
    return res.status(400).json({ target: 'attachId', message: '삭제할 첨부파일이 올바르지 않습니다.' })
  }

  let comment = await commentModel.getDocument(commentId);
  if (!Array.isArray(comment) || comment.length < 1) {
    return res.status(404).json({ target: 'commentId', message: '대상 댓글을 찾을 수 없습니다.' })
  } else {
    comment = comment[0];
    if (comment.userId !== req.userObject.userId && !req.userObject.isAdmin) {
      return res.status(403).json({ target: 'commentId', message: '첨부파일을 삭제할 권한이 없습니다.' })
    }
  }

  let attach = await commentModel.getDocumentAttach(commentId, attachId);
  if (!Array.isArray(attach) || attach.length < 1) {
    return res.status(404).json({ target: 'attachId', message: '삭제할 첨부파일을 찾을 수 없습니다.' })
  } else {
    attach = attach[0];
  }

  let result;
  try {
    result = await util.unlink(attach.attachPath);
  } catch (error) {
    if (result && result !== 'ENOENT') {
      logger.error('첨부파일 삭제 중 에러 : ', error, commentId);
      return res.status(500).json({ message: `첨부파일을 삭제하지 못했습니다.[${result || ''}]` })
    }
  }
  result = await commentModel.deleteCommentAttach(commentId, attachId);
  if (typeof result !== 'object') {
    result = await commentModel.getCommentAttach(commentId);
    if (Array.isArray(result) && result.length === 0) { //no more attachments
      await commentModel.updateComment({ commentId: commentId, hasAttach: false });
    }
    return res.status(200).json({ message: '첨부파일을 삭제하였습니다.' })
  } else {
    logger.error('첨부파일 삭제 중 에러 : ', result, commentId);
    return res.status(500).json({ message: `첨부파일을 삭제하지 못했습니다.[${result.code || ''}]` })
  }
})

router.delete('/:commentId([0-9]+)', adminOnly, async (req, res) => {
  let commentId = req.params.commentId;
  if (typeof commentId === 'string') {
    commentId = 1 * commentId;
  }
  if (!Number.isInteger(commentId) || commentId === 0) {
    return res.status(400).json({ target: 'commentId', message: '삭제할 댓글을 찾을 수 없습니다.' });
  }
  const comment = await commentModel.getComment(commentId);
  if (Array.isArray(comment) && comment.length > 0) {
    if ((comment[0].userId !== req.userObject.userId) && !req.userObject.isAdmin) {
      return res.status(403).json({ target: 'commentId', message: '댓글을 삭제할 수 있는 권한이 없습니다.' })
    }
    if (comment[0].childCount > 0) {
      return res.status(403).json({ target: 'childCount', message: '대댓글이 있는 댓글은 삭제할 수 없습니다.' })
    }
    
    let result = await commentModel.getCommentAttach(commentId);
    if(Array.isArray(result) && result.length > 0){
      try{
        let i=0;
        while(i < result.length){
          await util.removeUploadedFile(result[i].attachPath);
          await commentModel.deleteCommentAttach(commentId, result[i].attachId);
          i++;
        }
      }catch(error){
        logger.error('댓글 삭제를 위한 첨부파일 삭제 중 에러 : ', error);
        return res.status(500).json({message:`댓글을 삭제하는 중에 오류가 발생했습니다.[${error || ''}]` })
      }
    }
    result = await commentModel.deleteComment(commentId);
    if (typeof result === 'object' || result === 0) {
      logger.error('댓글 삭제 중 에러 : ', result, commentId);
      return res.status(500).json({ message: `댓글을 삭제하는 중에 오류가 발생했습니다.[${result.code || ''}]` });
    } else {
      if (comment[0].parentCommentId) {
        await commentModel.updateComment({ commentId: comment[0].parentCommentId, child: -1 });
      }
      await documentModel.updateDocumentCommentCount(comment[0].documentId, -1);
      return res.status(200).json({ message: '댓글을 삭제하였습니다.' });
    }
  } else {
    return res.status(404).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' });
  }
});

router.post('/attach', requiredSignin, async (req, res) => {
  multer(req, res, async function(error){
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
    let commentId = req.body.commentId;
    if (typeof commentId === 'string') {
      commentId = 1 * commentId
    }
    if (!Number.isInteger(commentId) || commentId === 0) {
      return res.status(400).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' })
    }
    if (!Array.isArray(req.files) || req.files.length < 1) {
      return res.status(400).json({ target: 'files', message: '첨부파일을 올려주세요.' })
    }
    let comment = await commentModel.getComment(commentId);
    if (Array.isArray(comment) && comment.length > 0) {
      if ((comment[0].userId === req.userObject.userId) || req.userObject.isAdmin) {
        const result = await util.uploadFile(req.files, 'attachComment', commentId, commentModel.createCommentAttach, commentId);
        if (result.status === 200 && !comment[0].hasAttach) {
          await commentModel.updateComment({ commentId: commentId, hasAttach: true });
        }
        if (result.status === 500) {
          logger.error('첨부파일 등록 중 에러 : ', result, commentId)
        }
        return res.status(result.status).json({ message: result.message });
      } else {
        return res.status(403).json({ target: 'commentId', message: '첨부파일을 올릴 수 있는 권한이 없습니다.' })
      }
    } else {
      return res.status(404).json({ target: 'commentId', message: '댓글을 찾을 수 없습니다.' })
    }
  });
});

router.get('/animal', adminOnly, async (req, res) => {
  let result = await commentModel.getAnimalNames();
  if (Array.isArray(result)) {
    return res.status(200).json(result.map(x => x.animalName));
  } else {
    logger.error('동물 이름 불러오기 에러 : ', result);
    return res.status(500).json({ message: `동물이름을 불러오는 데 실패하였습니다.[${result.code || ''}]` })
  }
})

router.post('/animal', adminOnly, async (req, res) => {
  let animalNames = req.body.animalNames;
  if (typeof animalNames === "string") {
    animalNames = [animalNames];
  }
  if (!Array.isArray(animalNames) || animalNames.length === 0) {
    return res.status(400).json({ target: 'animalNames', message: '등록할 동물이름을 입력해주세요.' })
  }
  let result = await commentModel.createAnimalNames(animalNames);
  if (result > 0) {
    return res.status(200).json({ message: '동물이름을 등록하였습니다.' })
  } else if (typeof result === 'object' && result.code === dbErrorCode.PKDUPLICATION) {
    return res.status(400).json({ target: 'animalNames', message: `이미 존재하는 동물 이름은 입력할 수 없습니다.[${result.detail || ''}]` })
  } else {
    logger.error('동물 이름 입력 중 에러 : ', result, animalNames);
    return res.status(500).json({ message: `동물 이름을 입력하지 못했습니다.[${result.code || ''}]` })
  }
})

router.delete('/animal/:animalName', adminOnly, async (req, res) => {
  let animalName = req.params.animalName;
  if (typeof animalName === "string") {
    animalName = [animalName];
  }
  if (!Array.isArray(animalName) || animalName.length === 0) {
    return res.status(400).json({ target: 'animalName', message: '삭제할 동물이름을 입력해주세요.' })
  }
  let result = await commentModel.deleteAnimalNames(animalName);
  if (result > 0) {
    return res.status(200).json({ message: '동물이름을 삭제하였습니다.' });
  } else {
    logger.error('동물 이름 삭제 중 에러 : ', result, animalName);
    return res.status(500).json({ message: `동물이름을 삭제하지 못했습니다.[${result.code || ''}]` })
  }
})

module.exports = router;
const signRouter = require('./routes/signRouter'),
    mainRouter = require('./routes/mainRouter'),
    authRouter = require('./routes/authRouter'),
    userRouter = require('./routes/userRouter'),
    boardRouter = require('./routes/boardRouter'),
    scrapRouter = require('./routes/scrapRouter'),
    documentRouter = require('./routes/documentRouter'),
    commentRouter = require('./routes/commentRouter'),
    reportRouter = require('./routes/reportRouter'),
    voteRouter = require('./routes/voteRouter'),
    messageRouter = require('./routes/messageRouter'),
    notificationRouter = require('./routes/notificationRouter'),
    groupRouter = require('./routes/groupRouter'),
    sanctionRouter = require('./routes/sanctionRouter');

module.exports = function(router) {
    router.use('/board', boardRouter);
    router.use('/comment', commentRouter);
    router.use('/document', documentRouter);
    router.use('/report', reportRouter);
    router.use('/vote', voteRouter);
    router.use('/scrap', scrapRouter);
    router.use('/auth', authRouter);
    router.use('/user', userRouter);
    router.use('/group', groupRouter);
    router.use('/message', messageRouter);
    router.use('/notification', notificationRouter);
    router.use('/sanction', sanctionRouter);
    router.use('/', signRouter);
    router.use('/', mainRouter); //need to be located at the last of routing '/'
};
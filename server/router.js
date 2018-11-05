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
    eventRouter = require('./routes/eventRouter'),
    messageRouter = require('./routes/messageRouter'),
    groupRouter = require('./routes/groupRouter');

module.exports = function (router) {
    router.use('/', signRouter);
    router.use('/', mainRouter);//need to be located at the last of routing '/'
    router.use('/board', boardRouter);
    router.use('/comment', commentRouter);
    router.use('/document', documentRouter);
    router.use('/report', reportRouter);
    router.use('/vote', voteRouter);
    router.use('/scrap', scrapRouter);
    router.use('/auth', authRouter);
    router.use('/user', userRouter);
    router.use('/event', eventRouter);
    router.use('/group', groupRouter);
    router.use('/message', messageRouter);
};
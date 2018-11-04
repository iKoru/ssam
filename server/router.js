const signRouter = require('./routes/signRouter'),
    mainRouter = require('./routes/mainRouter');

module.exports = function (router) {
    router.use('/', mainRouter);
    router.use('/', signRouter);
}
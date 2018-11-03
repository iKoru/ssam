const indexRouter = require('./routes/signRouter');

module.exports = function(router) {
    router.use('/', indexRouter(router));

}
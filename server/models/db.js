const { Pool } = require('pg'),
    config = require('../../config'),
    pool = new Pool(config.dbOptions);
module.exports = pool;
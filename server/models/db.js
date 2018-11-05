const { Pool } = require('pg'),
    config = require('../../config'), { partialUUID } = require('../util'),
    pool = new Pool(config.dbOptions),
    logger = require('../logger');

pool.on('error', (err) => {
    logger.error('UNEXPECTED ERROR ON IDLE CLIENT', err);
});

pool.executeQuery = async(query, parameters, callback) => {
    try {
        const client = await pool.connect(),
            res = null;
        try {
            res = await client.query({ name: partialUUID(), text: query, values: parameters }, callback)
            logger.log(`EXECUTING QUERY : ${query}, ${parameters}`);
        } finally {
            client.release();
        }
        return res;
    } catch (e) {
        logger.error('EXECUTING QUERY ERROR : ', e.stack);
    }
}
module.exports = pool;
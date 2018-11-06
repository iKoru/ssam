const pg = require('pg'),
    config = require('../../config'), { partialUUID } = require('../util'),
    logger = require('../logger'),
    pool = new pg.Pool(config.dbOptions);
    
pg.types.setTypeParser(20, 'text', parseFloat);//INT8
pg.types.setTypeParser(21, 'text', parseInt);//INT2
pg.types.setTypeParser(23, 'text', parseInt);//INT4
pg.types.setTypeParser(700, 'text', parseFloat);//FLOAT4
pg.types.setTypeParser(701, 'text', parseFloat);//FLOAT8
pg.types.setTypeParser(1700, 'text', parseFloat);//NUMERIC

pool.on('error', (err) => {
    logger.error('UNEXPECTED ERROR ON IDLE CLIENT', err);
});

pool.executeQuery = async(query, parameters, callback) => {
    try {
        const client = await pool.connect();
        let res = null;
        try {
            res = await pool.query({ name: partialUUID(), text: query, values: parameters }, callback)
            logger.log(`EXECUTING QUERY : ${query}, ${parameters}`);
        } finally {
            client.release();
        }
        switch(res.command){
            case 'SELECT':
                return res.rows;
            default:
                return res;
        }
        return res;
    } catch (e) {
        logger.error('EXECUTING QUERY ERROR : ', e.stack);
        logger.error('TRIED QUERY TO EXECUTE : ', query, parameters);
    }
}
module.exports = pool;
const pool_key = Symbol.for("SSAM.DB.CONNECTION.POOL"),
    builder_key = Symbol.for('SSAM.DB.SQL.BUILDER');
const { UUID } = require('../util');
let singleton = {};

if (Object.getOwnPropertySymbols(global).indexOf(pool_key) <= -1) {
    const pg = require('pg'),
        config = require('../../config'),
        logger = require('../logger'),
        pool = new pg.Pool(config.dbOptions);

    pg.types.setTypeParser(20, 'text', parseFloat); //INT8
    pg.types.setTypeParser(21, 'text', parseInt); //INT2
    pg.types.setTypeParser(23, 'text', parseInt); //INT4
    pg.types.setTypeParser(700, 'text', parseFloat); //FLOAT4
    pg.types.setTypeParser(701, 'text', parseFloat); //FLOAT8
    pg.types.setTypeParser(1700, 'text', parseFloat); //NUMERIC

    pool.on('error', (err) => {
        logger.error('UNEXPECTED ERROR ON IDLE CLIENT', err);
    });

    pool.executeQuery = async (name, input, callback) => {
        try {
            const client = await pool.connect();
            let res = null;
            try {
                res = name ? await pool.query({ name: name, text: input.text, values: input.values }, callback) :
                    await pool.query(input.text, input.values, callback);
                logger.log(`EXECUTING QUERY[${name}] : ${input.text}, ${input.values}`);
            } finally {
                await client.release();
            }
            logger.log("QUERY RESULT : ", JSON.stringify(res));
            if (res.command === 'SELECT') {
                return res.rows;
            } else if (res.rows.length > 0) { //returning statement
                return { rowCount: res.rowCount, rows: res.rows };
            } else {
                return res.rowCount;
            }
        } catch (e) {
            logger.error('EXECUTING QUERY ERROR : ', e.stack);
            logger.error('TRIED QUERY TO EXECUTE : ', '[' + name + ']', input.text, input.values);
            logger.error(e);
            return e;
        }
    };
    global[pool_key] = pool;
}
if (Object.getOwnPropertySymbols(global).indexOf(builder_key) <= -1) {
    global[builder_key] = require('squel').useFlavour('postgres');
}
Object.defineProperty(singleton, "instance", {
    get: function () {
        return global[pool_key];
    }
})
Object.defineProperty(singleton, "builder", {
    get: function () {
        return global[builder_key];
    }
})
Object.freeze(singleton);
module.exports = singleton;
const pool_key = Symbol.for("SSAM.DB.CONNECTION.POOL");
const { UUID } = require('../util');
let singleton = {};

if(Object.getOwnPropertySymbols(global).indexOf(pool_key) <= -1){
    const pg = require('pg'),
        config = require('../../config'),
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
    
    pool.executeQuery = async(name, input, callback) => {
        try {
            const client = await pool.connect();
            let res = null;
            try {
                res = await pool.query({ name: name || UUID(), text: input.text, values: input.values }, callback);
                logger.log(`EXECUTING QUERY : ${input.text}, ${input.values}`);
            } finally {
                client.release();
            }
            logger.log("QUERY RESULT : ", res);
            if(res.command === 'SELECT'){
                return res.rows;
            }else{
                return res.rowCount;
            }
        } catch (e) {
            logger.error('EXECUTING QUERY ERROR : ', e.stack);
            logger.error('TRIED QUERY TO EXECUTE : ', input.text, input.values);
            return e;
        }
    };
    global[pool_key] = pool;
}
Object.defineProperty(singleton, "instance", {
    get: function(){
        return global[pool_key];
    }
})
Object.freeze(singleton);
module.exports = singleton;
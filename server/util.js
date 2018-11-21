let moment = require('moment-timezone');
moment.tz.setDefault('Asia/Seoul');

exports.objectToQuerystring = (obj) => {
    return Object.keys(obj).filter((key) => obj[key] != undefined && obj[key] != '').reduce((str, key, i) => {
        let delimiter, val;
        delimiter = (i === 0) ? '?' : '&';
        if (Array.isArray(obj[key])) {
            key = encodeURIComponent(key);
            var arrayVar = obj[key].reduce((str, item) => {
                val = encodeURIComponent(typeof item === 'string' ? item : JSON.stringify(item));
                return [str, key, '=', val, '&'].join('');
            }, '');
            return [str, delimiter, arrayVar.trimRightString('&')].join('');
        } else {
            key = encodeURIComponent(key);
            val = encodeURIComponent(typeof obj[key] === 'string' ? obj[key] : JSON.stringify(obj[key]));
            return [str, delimiter, key, '=', val].join('');
        }
    }, '')
};

exports.isNumeric = (n) => {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

const partialUUID = () => {
    return ((1 + Math.random()) * 0x10000 | 0).toString(16).substring(1);
};

exports.partialUUID = partialUUID;

exports.UUID = () => {
    return partialUUID() + partialUUID() + '-' + partialUUID() + '-' + partialUUID() + '-' + partialUUID() + '-' + partialUUID() + partialUUID() + partialUUID();
}

exports.getYYYYMMDD = function (target = moment()) {
    return target.format('YMMDD');
    //return `${target.getFullYear()}${(target.getMonth()<9?'0'+(1+target.getMonth()):(1+target.getMonth()))}${target.getDate()<10?'0'+target.getDate():target.getDate()}`;
}

exports.getYYYYMMDDHH24MISS = function (target = moment()) {
    return target.format('YMMDDHHmmss');
    //return `${target.getFullYear()}${(target.getMonth()<9?'0'+(1+target.getMonth()):(1+target.getMonth()))}${target.getDate()<10?'0'+target.getDate():target.getDate()}${(target.getHours()<9?'0'+target.getHours():target.getHours())}${(target.getMinutes()<9?'0'+target.getMinutes():target.getMinutes())}${(target.getSeconds()<9?'0'+target.getSeconds():target.getSeconds())}`;
}

exports.moment = moment;

exports.safeStringLength = (string, length) => {
    return string?(string.length>length?string.substring(0, length):string):string;
}
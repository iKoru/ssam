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

exports.partialUUID = () => {
    return ((1 + Math.random()) * 0x10000 | 0).toString(16).substring(1);
}

exports.UUID = () => {
    return partialUUID() + partialUUID() + '-' + partialUUID() + '-' + partialUUID() + '-' + partialUUID() + '-' + partialUUID() + partialUUID() + partialUUID();
}
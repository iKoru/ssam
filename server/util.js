let moment = require('moment-timezone');
moment.tz.setDefault('Asia/Seoul');
const util = require('util');
const fs = require('fs');

exports.rename = util.promisify(fs.rename);
exports.mkdir = util.promisify(fs.mkdir);
exports.chmod = util.promisify(fs.chmod);
exports.copyFile = util.promisify(fs.copyFile);
exports.unlink = util.promisify(fs.unlink);

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

exports.getYYYYMMDD = function(target = moment()) {
    return target.format('YMMDD');
    //return `${target.getFullYear()}${(target.getMonth()<9?'0'+(1+target.getMonth()):(1+target.getMonth()))}${target.getDate()<10?'0'+target.getDate():target.getDate()}`;
}

exports.getYYYYMMDDHH24MISS = function(target = moment()) {
    return target.format('YMMDDHHmmss');
    //return `${target.getFullYear()}${(target.getMonth()<9?'0'+(1+target.getMonth()):(1+target.getMonth()))}${target.getDate()<10?'0'+target.getDate():target.getDate()}${(target.getHours()<9?'0'+target.getHours():target.getHours())}${(target.getMinutes()<9?'0'+target.getMinutes():target.getMinutes())}${(target.getSeconds()<9?'0'+target.getSeconds():target.getSeconds())}`;
}

exports.moment = moment;

exports.safeStringLength = (string, length) => {
    return string ? (string.length > length ? string.substring(0, length) : string) : string;
}

exports.uploadFile = async(files, targetPath, targetDirectory, saveFunction) => {
    if (files && files.length > 0) {
        let i = 0,
            result, errors = [];
        while (i < files.length) {
            result = await util.rename(files[i].path, targetPath + '/' + targetDirectory + '/' + files[i].filename);
            if (result) {
                if (result.code === 'ENOENT') {
                    result = await util.mkdir(targetPath + '/' + targetDirectory, 0o744);
                    if (result) {
                        errors.push({ index: i, message: '파일 저장경로 생성에 실패하였습니다.' });
                        await util.unlink(files[i].path);
                        continue;
                    } else {
                        result = await util.rename(files[i].path, targetPath + '/' + targetDirectory + '/' + files[i].filename);
                        if (result) {
                            errors.push({ index: i, message: '임시파일 이동에 실패하였습니다.' });
                            await util.unlink(files[i].path);
                            continue;
                        }
                    }
                } else if (result.code === 'EACCES') {
                    result = await util.chmod(targetPath + '/' + targetDirectory, 0o744);
                    if (result) {
                        errors.push({ index: i, message: '파일 저장경로 접근에 실패하였습니다.' });
                        await util.unlink(files[i].path);
                        continue;
                    } else {
                        result = await util.rename(files[i].path, targetPath + '/' + targetDirectory + '/' + files[i].filename);
                        if (result) {
                            errors.push({ index: i, message: '임시파일 이동에 실패하였습니다.' });
                            await util.unlink(files[i].path);
                            continue;
                        }
                    }
                } else {
                    errors.push({ index: i, message: '임시파일 이동에 실패하였습니다.' });
                    await util.unlink(files[i].path);
                    continue;
                }
            }
            result = await saveFunction(targetDirectory, path.parse(files[i].filename).name, files[i].originalname, path.extname(files[i].filename), `${targetPath}/${targetDirectory}/${files[i].filename}`);
            if (typeof result === 'object' || result === 0) {
                errors.push({ index: i, message: '파일 정보 저장에 실패하였습니다.' });
                await util.unlink(targetPath + '/' + targetDirectory + '/' + files[i].filename);
            }
            i++;
        }
        if (errors.length > 0) {
            logger.error('파일 업로드 에러 : ', errors);
        }
        return { status: errors.length === files.length ? 500 : 200, message: errors.length > 0 ? `총 ${files.length}건 중 ${errors.length}건의 업로드는 실패하였습니다.` : '성공적으로 첨부파일을 업로드하였습니다.' }
    } else {
        return { status: 200, message: '저장할 파일이 없습니다.' };
    }
}
let moment = require('moment-timezone');
moment.locale('ko');
moment.tz.setDefault('Asia/Seoul');
const util = require('util'),
    logger = require('./logger');
const fs = require('fs'),
    path = require('path'),
    { attachBasePath } = require('../config');

const rename = util.promisify(fs.rename)
    , mkdir = util.promisify(fs.mkdir)
    , chmod = util.promisify(fs.chmod)
    , copyFile = util.promisify(fs.copyFile)
    , unlink = util.promisify(fs.unlink);

exports.rename = rename;
exports.mkdir = mkdir;
exports.chmod = chmod;
exports.copyFile = copyFile;
exports.unlink = unlink;

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
    return string ? (string.length > length ? string.substring(0, length) : string) : string;
}

exports.uploadFile = async (files, targetPath, targetDirectory, saveFunction) => {
    if (files && files.length > 0) {
        let i = 0,
            result, errors = [];
        try {
            while (i < files.length) {
                try {
                    result = await rename(files[i].path, attachBasePath + targetPath + '/' + targetDirectory + '/' + files[i].filename);
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        try {
                            result = await mkdir(attachBasePath + targetPath + '/' + targetDirectory, 0o744);
                        } catch (error2) {
                            logger.error('파일 저장경로 생성 중 에러 : ', error2)
                            errors.push({ index: i, message: '파일 저장경로 생성에 실패하였습니다.' });
                            try {
                                await unlink(files[i].path);
                            } catch (error3) {
                                logger.error('파일 업로드 실패 후 삭제 중 에러 : ', error3)
                            }
                            i++;
                            continue;
                        }
                        try {
                            result = await rename(files[i].path, attachBasePath + targetPath + '/' + targetDirectory + '/' + files[i].filename);
                        } catch (error2) {
                            logger.error('파일 이동 중 에러 : ', error2)
                            errors.push({ index: i, message: '임시파일 이동에 실패하였습니다.' });
                            try {
                                await unlink(files[i].path);
                            } catch (error3) {
                                logger.error('파일 업로드 실패 후 삭제 중 에러 : ', error3)
                            }
                            i++;
                            continue;
                        }
                    } else if (error.code === 'EACCES') {
                        try {
                            result = await chmod(attachBasePath + targetPath + '/' + targetDirectory, 0o744);
                        } catch (error2) {
                            logger.error('파일 업로드를 위한 권한 변경 중 에러 : ', error2)
                            errors.push({ index: i, message: '파일 저장경로 접근에 실패하였습니다.' });
                            await unlink(files[i].path);
                            i++;
                            continue;
                        }
                        try {
                            result = await rename(files[i].path, attachBasePath + targetPath + '/' + targetDirectory + '/' + files[i].filename);
                        } catch (error2) {
                            logger.error('파일 업로드 후 이동 중 에러 : ', error2)
                            errors.push({ index: i, message: '임시파일 이동에 실패하였습니다.' });
                            try {
                                await unlink(files[i].path);
                            } catch (error3) {
                                logger.error('파일 업로드 실패 후 삭제 중 에러 : ', error3)
                            }
                            i++;
                            continue;
                        }
                    } else {
                        logger.error('파일 업로드 실패 : ', error)
                        errors.push({ index: i, message: '임시파일 이동에 실패하였습니다.' });
                        try {
                            await unlink(files[i].path);
                        } catch (error2) {
                            logger.error('파일 업로드 실패 후 삭제 중 에러 : ', error2)
                        }
                        i++;
                        continue;
                    }
                }
                if(typeof saveFunction === 'function'){
                    try {
                        result = await saveFunction(targetDirectory, path.parse(files[i].filename).name, files[i].originalname, path.extname(files[i].filename), `${targetPath}/${targetDirectory}/${files[i].filename}`);
                        if (typeof result === 'object' || result === 0) {
                            logger.error('파일 업로드 이후 save function 실행 중 에러 : ', result)
                            errors.push({ index: i, message: '파일 정보 저장에 실패하였습니다.' });
                            try {
                                await unlink(attachBasePath + targetPath + '/' + targetDirectory + '/' + files[i].filename);
                            } catch (error3) {
                                logger.error('파일 업로드 실패 후 삭제 중 에러 : ', error3)
                            }
                        }
                    } catch (error) {
                        logger.error('파일 업로드 이후 save function 실행 중 에러 : ', error)
                        errors.push({ index: i, message: '파일 정보 저장에 실패하였습니다.' });
                        try {
                            await unlink(attachBasePath + targetPath + '/' + targetDirectory + '/' + files[i].filename);
                        } catch (error3) {
                            logger.error('파일 업로드 실패 후 삭제 중 에러 : ', error3)
                        }
                    }
                }
                i++;
            }
        } catch (error) {
            logger.error('파일 업로드 중 에러 :', error);
            throw error;
        }
        if (errors.length > 0) {
            logger.error('파일 업로드 에러 : ', errors);
        }
        return { status: errors.length === files.length ? 500 : 200, message: errors.length > 0 ? `총 ${files.length}건 중 ${errors.length}건의 업로드는 실패하였습니다.` : '성공적으로 첨부파일을 업로드하였습니다.' }
    } else {
        return { status: 200, message: '저장할 파일이 없습니다.' };
    }
}

exports.removeUploadedFile = async(targetPath) => {
    return await unlink(attachBasePath + targetPath);
}

exports.shallowArrayEquals = (a, b) => {
    if (a.length !== b.length) {
        return false
    }
    return a.every(x => b.includes(x));
}
const pool = require('./db').instance,
    builder = require('./db').builder;
const documentModel = require('./documentModel'),
    util = require('../util');

const getChildComments = async(parentCommentId, documentId) => {
    return await pool.executeQuery('getChildComments' + (documentId ? 'docu' : ''),
        builder.select()
        .fields({
            'USER_ID': '"userId"',
            'COMMENT_ID': '"commentId"',
            'DOCUMENT_ID': '"documentId"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'RESTRICTION_STATUS': '"restrictionStatus"',
            'CHILD_COUNT': '"childCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'ANIMAL_NAME': '"animalName"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .field(builder.case().when('IS_DELETED = true').then('삭제된 댓글입니다.').else(builder.rstr('CONTENTS')), '"contents"')
        .from('SS_MST_COMMENT')
        .where('DOCUMENT_ID = ?', documentId || builder.rstr('DOCUMENT_ID'))
        .where('PARENT_COMMENT_ID = ?', parentCommentId)
        .order('COMMENT_ID')
        .toParam()
    );
}


const getCommentAnimalName = async(documentId, userId) => {
    let document = await documentModel.getDocument(documentId);
    if (document && document.length > 0) {
        document = document[0];
        if (document.userId === userId) {
            return { animalName: '글쓴이' };
        } else {
            let names = await pool.executeQuery('getCommentAnimalName',
                builder.select()
                .fields({
                    'ANIMAL_NAME': '"animalName"',
                    'GENERATION': '"generation"'
                })
                .from('SS_HST_DOCUMENT_ANIMAL')
                .where('DOCUMENT_ID = ?', documentId)
                .where('USER_ID = ?', userId)
                .toParam()
            )
            if (Array.isArray(names) && names.length > 0 && names[0].animalName) {
                return { animalName: names[0].animalName, generation: names[0].generation };
            } else {
                let generation = 1;
                while (1) {
                    names = await pool.executeQuery('getNewCommentAnimalName',
                        builder.select()
                        .field('ANIMAL.ANIMAL_NAME', '"animalName"')
                        .from('SS_MST_ANIMAL_NAME', 'ANIMAL')
                        .where('ANIMAL_NAME NOT IN (SELECT ANIMAL_NAME FROM SS_HST_DOCUMENT_ANIMAL WHERE DOCUMENT_ID = ? AND GENERATION = ?)', documentId, generation)
                        .toParam()
                    )
                    if (names.code) {
                        return names;
                    } else if (names.length > 0) {
                        const animalName = names[Math.floor(Math.random() * names.length)].animalName;
                        let result = await createCommentAnimalName(documentId, userId, animalName, generation);
                        if (!Number.isInteger(result) || result === 0) {
                            return result;
                        }
                        return { animalName: animalName, generation: generation };
                    } else {
                        generation += 1;
                    }
                }
            }
        }
    } else {
        return { animalName: null };
    }
}

exports.getChildComments = getChildComments;

exports.getComments = async(documentId, page = 1) => {
    if (!documentId) {
        return [];
    }
    return await pool.executeQuery('getComments',
        builder.select()
        .fields({
            'USER_ID': '"userId"',
            'COMMENT_ID': '"commentId"',
            'DOCUMENT_ID': '"documentId"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'REPORT_COUNT': '"reportCount"',
            'RESTRICTION_STATUS': '"restrictionStatus"',
            'CHILD_COUNT': '"childCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'ANIMAL_NAME': '"animalName"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .field(builder.case().when('IS_DELETED = true').then('삭제된 댓글입니다.').else(builder.rstr('CONTENTS')), '"contents"')
        .from('SS_MST_COMMENT')
        .where('DOCUMENT_ID = ?', documentId)
        .where('DEPTH = 0')
        .order('COMMENT_ID')
        .limit(100)
        .offset((page - 1) * 100)
        .toParam()
    )
}

const updateComment = async(comment) => {
    if (!comment.commentId) {
        return 0;
    }
    let query = builder.update().table('SS_MST_COMMENT');
    if (comment.contents !== undefined) {
        query.set('CONTENTS', comment.contents)
    }
    if (comment.child !== undefined) {
        if(comment.child > 0){
            query.set('CHILD_COUNT', builder.str('CHILD_COUNT + 1'))
        }else if(comment.child < 0){
            query.set('CHILD_COUNT', builder.str('CHILD_COUNT - 1'))
        }
    }
    if (comment.restrictionStatus !== undefined) {
        query.set('RESTRICTION_STATUS', comment.restrictionStatus)
    }
    if (comment.isDeleted !== undefined) {
        query.set('IS_DELETED', comment.isDeleted)
    }
    if (comment.reserved1 !== undefined) {
        query.set('RESERVED1', comment.reserved1)
    }
    if (comment.reserved2 !== undefined) {
        query.set('RESERVED2', comment.reserved2)
    }
    if (comment.reserved3 !== undefined) {
        query.set('RESERVED3', comment.reserved3)
    }
    if (comment.reserved4 !== undefined) {
        query.set('RESERVED4', comment.reserved4)
    }
    return await pool.executeQuery('updateComment' + (comment.contents ? 'contents' : '') + (comment.child ? (comment.child>0?'c1':'c0') : '') + (comment.restrictionStatus ? 'rest' : '') + (comment.isDeleted !== undefined ? 'delete' : '') + (comment.reserved1 ? '1' : '') + (comment.reserved2 ? '2' : '') + (comment.reserved3 ? '3' : '') + (comment.reserved4 ? '4' : ''),
        query.where('COMMENT_ID = ?', comment.commentId)
        .toParam()
    )
}

exports.updateComment = updateComment;

const deleteChildComment = async(parentCommentId, documentId) => {
    return await pool.executeQuery('deleteChildComment',
        builder.delete()
        .from('SS_MST_COMMENT')
        .where('DOCUMENT_ID = ?', documentId)
        .where('PARENT_COMMENT_ID = ?', parentCommentId)
        .toParam()
    )
}

exports.deleteComment = async(commentId) => {
    let comment = await getComment(commentId);
    if(!Array.isArray(comment)){
        return comment;
    }else if(comment.length > 0){    
        comment = comment[0];
    }else{
        return 1;//already deleted
    }
    const result = await pool.executeQuery('deleteComment',
        builder.delete()
        .from('SS_MST_COMMENT')
        .where('COMMENT_ID = ?', commentId)
        .toParam()
    );
    if (result > 0 && comment.childCount > 0) {
        await deleteChildComment(commentId, comment.documentId);
    }
    return result;
}

exports.createComment = async(comment) => {
    const animalName = await getCommentAnimalName(comment.documentId, comment.userId);
    if (animalName.animalName === null) {
        return animalName;
    }
    let result = await pool.executeQuery('createComments',
        builder.insert()
        .into('SS_MST_COMMENT')
        .setFields({
            'COMMENT_ID': builder.rstr('nextval(\'SEQ_SS_MST_COMMENT\')'),
            'DOCUMENT_ID': comment.documentId,
            'USER_ID': comment.userId,
            'CONTENTS': comment.contents,
            'USER_NICKNAME': comment.userNickName,
            'PARENT_COMMENT_ID': comment.parentCommentId,
            'DEPTH': comment.parentCommentId ? 1 : 0,
            'WRITE_DATETIME': util.getYYYYMMDDHH24MISS(),
            'IS_ANONYMOUS': comment.isAnonymous,
            'ANIMAL_NAME': animalName.animalName + (animalName.generation > 1 ? ` ${animalName.generation}세` : ''),
            'RESERVED1': comment.reserved1,
            'RESERVED2': comment.reserved2,
            'RESERVED3': comment.reserved3,
            'RESERVED4': comment.reserved4
        })
        .returning('COMMENT_ID', '"commentId"')
        .toParam()
    )

    if (result.rowCount > 0) {
        if (comment.parentCommentId) {
            await updateComment({
                commentId: comment.parentCommentId,
                child: 1
            });
        }
        await documentModel.updateDocumentCommentCount(comment.documentId, 1);
    }
    return result;
}

const getComment = async(commentId) => {
    return await pool.executeQuery('getComment',
        builder.select()
        .fields({
            'USER_ID': '"userId"',
            'COMMENT_ID': '"commentId"',
            'DOCUMENT_ID': '"documentId"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'REPORT_COUNT': '"reportCount"',
            'RESTRICTION_STATUS': '"restrictionStatus"',
            'CHILD_COUNT': '"childCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'IS_DELETED':'"isDeleted"',
            'PARENT_COMMENT_ID':'"parentCommentId"',
            'ANIMAL_NAME': '"animalName"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .field(builder.case().when('IS_DELETED = true').then('삭제된 댓글입니다.').else(builder.rstr('CONTENTS')), '"contents"')
        .from('SS_MST_COMMENT')
        .where('COMMENT_ID = ?', commentId)
        .toParam()
    )
}

exports.getComment = getComment;

exports.getUserComment = async(userId, isAdmin, page = 1) => {
    let query = builder.select()
        .fields({
            'COMMENT_ID': '"commentId"',
            'DOCUMENT_ID': '"documentId"',
            'CONTENTS': '"contents"',
            'IS_DELETED': '"isDeleted"',
            'VOTE_UP_COUNT': '"voteUpCount"',
            'VOTE_DOWN_COUNT': '"voteDownCount"',
            'REPORT_COUNT': '"reportCount"',
            'RESTRICTION_STATUS': '"restrictionStatus"',
            'CHILD_COUNT': '"childCount"',
            'WRITE_DATETIME': '"writeDateTime"',
            'RESERVED1': '"reserved1"',
            'RESERVED2': '"reserved2"',
            'RESERVED3': '"reserved3"',
            'RESERVED4': '"reserved4"'
        })
        .field(builder.case().when('IS_ANONYMOUS = true').then('익명').else(builder.rstr('USER_NICKNAME')), '"nickName"')
        .from('SS_MST_COMMENT')
        .where('USER_ID = ?', userId);
    if (!isAdmin) {
        query.where('IS_DELETED = false')
    }
    return await pool.executeQuery('getUserComment',
        query
        .order('COMMENT_ID', false)
        .limit(10)
        .offset((page - 1) * 10)
        .toParam()
    )
}

exports.updateCommentVote = async(commentId, isUp, isCancel) => {
    return await pool.executeQuery('updateCommentVote' + (isUp ? 'up' : 'down'),
        builder.update()
        .table('SS_MST_COMMENT')
        .set(isUp ? 'VOTE_UP_COUNT' : 'VOTE_DOWN_COUNT', builder.str(isUp ? `VOTE_UP_COUNT ${isCancel?'-':'+'} 1` : `VOTE_DOWN_COUNT ${isCancel?'-':'+'} 1`))
        .where('COMMENT_ID = ?', commentId)
        .toParam()
    )
}

exports.updateCommentReport = async(commentId) => {
    return await pool.executeQuery('updateCommentReport',
        builder.update()
        .table('SS_MST_COMMENT')
        .set('REPORT_COUNT', builder.str('REPORT_COUNT + 1'))
        .where('COMMENT_ID = ?', commentId)
        .toParam()
    )
}

exports.getAnimalNames = async() => {
    return await pool.executeQuery('getAnimalName',
        builder.select()
        .field('ANIMAL_NAME', '"animalName"')
        .from('SS_MST_ANIMAL_NAME')
        .toParam()
    );
}

exports.deleteAnimalNames = async(animalNames) => {
    return await pool.executeQuery('deleteAnimalName' + animalNames.length,
        builder.delete()
        .from('SS_MST_ANIMAL_NAME')
        .where('ANIMAL_NAME IN ?', animalNames)
        .toParam()
    )
}

exports.createAnimalNames = async(animalNames) => {
    return await pool.executeQuery('createAnimalName' + animalNames.length,
        builder.insert()
        .into('SS_MST_ANIMAL_NAME')
        .setFieldsRows(animalNames.map(x => ({ 'ANIMAL_NAME': x })))
        .toParam()
    )
}

const createCommentAnimalName = async(documentId, userId, animalName, generation) => {
    return await pool.executeQuery('createCommentAnimalName',
        builder.insert()
        .into('SS_HST_DOCUMENT_ANIMAL')
        .setFields({
            'DOCUMENT_ID': documentId,
            'USER_ID': userId,
            'ANIMAL_NAME': animalName,
            'GENERATION': generation
        })
        .toParam()
    )
}
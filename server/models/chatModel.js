const pool = require('./db').instance,
    builder = require('./db').builder;

const getChat = async(chatId) => {
    return await pool.executeQuery('getChat',
        builder.select()
        .fields({
            'CHAT_ID': '"chatId"',
            'CHAT_TYPE': '"chatType"',
            'USER1_ID': '"user1Id"',
            'USER2_ID': '"user2Id"',
            'USER1_STATUS': '"user1Status"',
            'USER2_STATUS': '"user2Status"'
        })
        .from('SS_MST_CHAT')
        .where('CHAT_ID = ?', chatId)
        .toParam()
    );
}

exports.getChat = getChat;

exports.getChats = async(userId, page = 1) => {
    return await pool.executeQuery('getChats',
        builder.select()
        .fields({
            'CHAT_ID': '"chatId"',
            'CHAT_TYPE': '"chatType"',
            'USER1_ID': '"user1Id"',
            'USER2_ID': '"user2Id"',
            'USER1_STATUS': '"user1Status"',
            'USER2_STATUS': '"user2Status"'
        })
        .from('SS_MST_CHAT')
        .where('USER1_ID = ? OR USER2_ID = ?', userId, userId)
        .limit(10)
        .offset((page - 1) * 10)
        .toParam()
    );
}

exports.getMessages = async(chatId, timestampBefore, timestampAfter) => {
    let query = builder.select()
        .fields({
            'SENDER_USER_ID': '"senderUserId"',
            'SEND_TIMESTAMP': '"sendTimestamp"',
            'CONTENTS': '"contents"'
        })
        .from('SS_HST_MESSAGE')
        .where('CHAT_ID = ?', chatId);
    if (timestampBefore) {
        query.where('SEND_TIMESTAMP < ?', builder.rstr('TO_TIMESTAMP(?, \'YYYYMMDDHH24MISS\')', timestampBefore))
    }
    if (timestampAfter) {
        query.where('SEND_TIMESTAMP > ?', builder.rstr('TO_TIMESTAMP(?, \'YYYYMMDDHH24MISS\')', timestampAfter))
    }
    return await pool.executeQuery('getMessages' + timestampBefore ? 'Before' : '' + timestampAfter ? 'After' : '',
        query.toParam()
    )
}

exports.createMessage = async(chatId, userId, contents) => {
    return await pool.executeQuery('createMessage',
        builder.insert()
        .into('SS_HST_MESSAGE')
        .setFields({
            'CHAT_ID': chatId,
            'SENDER_USER_ID': userId,
            'CONTENTS': contents
        })
        .toParam()
    );
}

exports.updateChat = async(chatId, userId, status) => {
    const chat = getChat(chatId);
    if (chat.length > 0) {
        let query = builder.update().table('SS_MST_CHAT');
        if (chat[0].user1Id === userId) {
            query.set('USER1_STATUS', status);
        } else if (chat[0].user2Id === userId) {
            query.set('USER2_STATUS', status);
        } else {
            return 0;
        }
        return await pool.executeQuery('updateChat',
            query.where('CHAT_ID = ?', chatId).toParam()
        );
    } else {
        return 0;
    }
}

exports.deleteChat = async(chatId) => {
    let result = await pool.executeQuery('deleteMessage',
        builder.delete()
        .from('SS_HST_MESSAGE')
        .where('CHAT_ID = ?', chatId)
        .toParam()
    );
    if (result > 0) {
        result = await pool.executeQuery('deleteChat',
            builder.delete()
            .from('SS_MST_CHAT')
            .where('CHAT_ID = ?', chatId)
            .toParam()
        );
    }
    return result;
}
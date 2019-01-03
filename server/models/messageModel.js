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

exports.getChatsAdmin = async(user1Id, user2Id, chatType, page = 1) => {
    if (!user1Id) return [];
    let query = builder.select()
        .fields({
            'CHAT_ID': '"chatId"',
            'CHAT_TYPE': '"chatType"',
            'USER1_ID': '"user1Id"',
            'USER2_ID': '"user2Id"',
            'USER1_STATUS': '"user1Status"',
            'USER2_STATUS': '"user2Status"'
        })
        .from('SS_MST_CHAT')
        .where('USER1_ID = ? OR USER2_ID = ?', user1Id, user1Id);
    if (user2Id) {
        query.where('USER1_ID = ? OR USER2_ID = ?', user2Id, user2Id);
    }
    if (chatType) {
        query.where('CHAT_TYPE = ?', chatType);
    }
    return await pool.executeQuery('findChat' + (user2Id ? '2' : '') + (chatType ? 'type' : ''),
        query.limit(10).offset((page - 1) * 10).order('CHAT_ID').toParam()
    );
}

exports.getChats = async(user1Id, user2Id, chatType, page = 1) => {
    if (!user1Id) return [];
    let query = builder.selectWindow()
        .distinct('CHAT.CHAT_ID')
        .fields({
            'CHAT.CHAT_ID':'"chatId"',
            'CHAT_TYPE':'"chatType"',
            'USER1_ID':'"user1Id"',
            'USER2_ID':'"user2Id"',
            'USER1_STATUS':'"user1Status"',
            'USER2_STATUS':'"user2Status"',
            'TO_CHAR(FIRST_VALUE(SEND_TIMESTAMP) OVER w, \'YYYYMMDDHH24MISS\')':'"lastSendTimestamp"',
            'FIRST_VALUE(CONTENTS) OVER w':'"lastContents"'
        })
        .from('SS_MST_CHAT', 'CHAT')
        .left_join('SS_HST_MESSAGE', 'MESSAGE', 'CHAT.CHAT_ID = MESSAGE.CHAT_ID')
        query.where('(USER1_ID = ? AND USER1_STATUS <> \'DELETED\') OR (USER2_ID = ? AND USER2_STATUS <> \'DELETED\')', user1Id, user1Id);
    if (user2Id) {
        query.where('(USER1_ID = ? AND USER1_STATUS <> \'DELETED\') OR (USER2_ID = ? AND USER2_STATUS <> \'DELETED\')', user2Id, user2Id);
    }
    if (chatType) {
        query.where('CHAT_TYPE = ?', chatType);
    }
        query.window('CHAT.CHAT_ID', 'SEND_TIMESTAMP', false, 'w')
    return await pool.executeQuery('findChat' + (user2Id ? '2' : '') + (chatType ? 'type' : ''),
        builder.select().field('count(*) OVER()', '"totalCount"').field('*').from(query, 'MST').limit(10).offset((page - 1) * 10).order('"lastSendTimestamp"', false).toParam()
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
        query.order('SEND_TIMESTAMP', false).limit(15).toParam()
    )
}

exports.createMessage = async(chatId, userId, contents) => {
    return await pool.executeQuery('createMessage',
        builder.insert()
        .into('SS_HST_MESSAGE')
        .setFields({
            'CHAT_ID': chatId,
            'SENDER_USER_ID': userId,
            'CONTENTS': contents,
            'SEND_TIMESTAMP': builder.rstr('current_timestamp')
        })
        .toParam()
    );
}

exports.updateChat = async(chatId, userId, status) => {
    const chat = await getChat(chatId);
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
    if (result >= 0) {
        result = await pool.executeQuery('deleteChat',
            builder.delete()
            .from('SS_MST_CHAT')
            .where('CHAT_ID = ?', chatId)
            .toParam()
        );
    }
    return result;
}

exports.createChat = async(user1Id, user2Id, chatType) => {
    return await pool.executeQuery('createChat',
        builder.insert()
        .into('SS_MST_CHAT')
        .setFields({
            'CHAT_ID': builder.rstr('CAST(nextval(\'SEQ_SS_MST_CHAT\') AS INTEGER)'),
            'CHAT_TYPE': chatType,
            'USER1_ID': user1Id,
            'USER2_ID': user2Id
        })
        .returning('CHAT_ID', '"chatId"')
        .toParam()
    );
}
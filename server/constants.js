exports.reserved = ['document', 'documents', 'profile',
    'profiles', 'auth', 'user', 'users', 'comment', 'comments',
    'vote', 'votes', 'report', 'reports', 'index', 'scraps',
    'scrap', 'board', 'boards', 'manage', 'manages', 'chat',
    'chats', 'message', 'messages', 'group', 'groups', 'event',
    'events', 'signup', 'signin', 'signout', 'resetPassword',
    'notification', 'notifications', 'survey', 'list'
];

exports.dbErrorCode = {
    FKVIOLATION: '23503',
    PKDUPLICATION: '23505'
}

exports.reservedNickName = ['admin', 'ADMIN', 'ADMINISTRATOR', 'administrator', '관리자', '운영자', '운영진', '익명', '필명숨김'];
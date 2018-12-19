exports.reserved = ['document', 'documents', 'profile',
    'profiles', 'auth', 'user', 'users', 'comment', 'comments',
    'vote', 'votes', 'report', 'reports', 'index', 'scraps',
    'scrap', 'board', 'boards', 'manage', 'manages', 'chat',
    'chats', 'message', 'messages', 'group', 'groups', 'event',
    'events', 'signup', 'signin', 'signout', 'resetPassword',
    'notification', 'notifications', 'survey', 'list', 'admin', 'ADMIN',
    'ADMINISTRATOR', 'administrator', 'attach', 'profiles', 'animal', 'loungeBest', 'topicBest',
    'lounge', 'topic', 'type', 'best', 'sanction', 'userId', 'nickName'
];

exports.dbErrorCode = {
    FKVIOLATION: '23503',
    PKDUPLICATION: '23505'
}

exports.reservedNickName = ['admin', 'ADMIN', 'ADMINISTRATOR', 'administrator', '관리자', '운영자', '운영진', '익명', '필명숨김'];

exports.emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(sen|goe|ice|gwe|cbe|cne|dje|sje|jbe|jne|gen|gbe|gne|use|pen|jje)\.go\.kr\b/
exports.userIdRegex = /(?=.*[a-zA-Z]+)(?=.*[a-zA-Z0-9_!\^&\*\$]{4,50}).*/
exports.boardIdRegex = [/^(?:[a-zA-Z]+)(?:[a-zA-Z0-9\-_]{0,15})$/, /^((?!(\-\-|__)).)*$/]
exports.regionGroup = {
    sen: '서울',
    goe: '경기',
    ice: '인천',
    gwe: '강원',
    cbe: '충북',
    cne: '충남',
    dje: '대전',
    sje: '세종',
    jbe: '전북',
    jne: '전남',
    gen: '광주',
    gbe: '경북',
    gne: '경남',
    use: '울산',
    pen: '부산',
    jje: '제주'
}

exports.boardTypeDomain = { 'D': '아카이브', 'L': '라운지', 'T': '토픽' };

exports.commentNotificationTemplate = '작성하신 글에 $1건의 새로운 댓글이 있습니다.';
exports.childCommentNotificationTemplate = '작성하신 댓글에 $1건의 새로운 대댓글이 있습니다.';
exports.defaultTopicCategories = ['일반', '정보', '질문'];

let jwtErrorMessages = {};
jwtErrorMessages['jwt expired'] = '세션이 만료되었습니다.';
jwtErrorMessages['jwt malformed'] = '비정상적인 경로의 접근입니다.';
jwtErrorMessages['jwt signature is required'] = '세션이 존재하지 않습니다.';
jwtErrorMessages['invalid signature'] = '비정상적인 경로의 접근입니다.';
jwtErrorMessages['jwt not active'] = '세션이 아직 구성되지 않았습니다.';

exports.jwtErrorMessages = jwtErrorMessages;
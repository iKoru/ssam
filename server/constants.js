exports.reserved = ['document', 'documents', 'profile',
    'profiles', 'auth', 'user', 'users', 'comment', 'comments',
    'vote', 'votes', 'report', 'reports', 'index', 'scraps',
    'scrap', 'board', 'boards', 'manage', 'manages', 'chat',
    'chats', 'message', 'messages', 'group', 'groups', 'event',
    'events', 'signup', 'signin', 'signout', 'resetPassword',
    'notification', 'notifications', 'survey', 'list', 'admin', 'ADMIN',
    'ADMINISTRATOR', 'administrator', 'attach', 'profiles', 'animal',
    'lounge', 'topic', 'type', 'best', 'sanction', 'userId', 'nickName',
    'myPage', 'myBoard', 'myCommunity', 'pedagy', 'myPedagy', 'Pedagy',
    'tools', 'privacy', 'contract', 'rules', 'error', 'search', 'searchBoard', 'searchDocument', 'myBoard', 'myDocument', 'myComment', 'authSubmit'
];

exports.dbErrorCode = {
    FKVIOLATION: '23503',
    PKDUPLICATION: '23505'
}

exports.reservedNickName = ['admin', 'ADMIN', 'ADMINISTRATOR', 'administrator', '관리자', '운영자', '운영진', '익명', '필명숨김'];

exports.emailRegex = /[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(sen\.go|goe\.go|ice\.go|gwe\.go|cbe\.go|cne\.go|dje\.go|sje\.go|jbedu|jne\.go|gen\.go|gbe\.go|gne\.go|use\.go|pen\.go|jje\.go)\.kr\b/
exports.userIdRegex = /(?=.*[a-zA-Z]+)(?=.*[a-zA-Z0-9_!\^&\*\$]{4,50}).*/
exports.boardIdRegex = [/^(?:[a-zA-Z]+)(?:[a-zA-Z0-9\-_]{0,15})$/, /^((?!(\-\-|__)).)*$/]
exports.regionGroup = {
    'sen.go': '서울',
    'goe.go': '경기',
    'ice.go': '인천',
    'gwe.go': '강원',
    'cbe.go': '충북',
    'cne.go': '충남',
    'dje.go': '대전',
    'sje.go': '세종',
    'jbedu': '전북',
    'jne.go': '전남',
    'gen.go': '광주',
    'gbe.go': '경북',
    'gne.go': '경남',
    'use.go': '울산',
    'pen.go': '부산',
    'jje.go': '제주'
}

exports.boardTypeDomain = { 'D': '아카이브', 'L': '라운지', 'T': '토픽', 'X':'기타 게시판', 'N':'예비교사 게시판', 'E':'전직교사 게시판' };
exports.groupTypeDomain = ['G', 'M', 'R', 'N', 'A', 'E', 'D']
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
exports.imageExtensions = ['jpg', 'jpeg', 'gif', 'png', 'tiff', 'tif'];
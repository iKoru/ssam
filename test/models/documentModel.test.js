/* global expect */
const documentModel = require('../../server/models/documentModel');

// test('create document - init', async(done) => {
//     expect(await documentModel.createDocument({
//         boardId: 'free',
//         userId: 'orange',
//         isAnonymous: false,
//         title: '쌤쌤',
//         contents: '코코코하하하 테스트',
//         allowAnonymous: false
//     })).toHaveProperty('rowCount', 1);
//     expect(await documentModel.createDocument({
//         boardId: 'free',
//         userId: 'blue',
//         isAnonymous: true,
//         title: '테스트 글 제목!',
//         contents: '하하하 테스트',
//         allowAnonymous: false
//     })).toHaveProperty('rowCount', 1);
//     expect(await documentModel.createDocument({
//         boardId: 'free',
//         userId: 'orange',
//         isAnonymous: true,
//         title: '재미있는 개발놀이!',
//         contents: '쿄쿄쿄',
//         allowAnonymous: false
//     })).toHaveProperty('rowCount', 1);
//     expect(await documentModel.createDocument({
//         boardId: 'nofree',
//         userId: 'orange',
//         isAnonymous: true,
//         title: '가나다라마바사',
//         contents: '하햐허혀',
//         allowAnonymous: false
//     })).toHaveProperty('rowCount', 1);
//     expect(await documentModel.createDocument({
//         boardId: 'nofree',
//         userId: 'blue',
//         isAnonymous: false,
//         title: '여긴 다른 게시판이지롱',
//         contents: '하하하 테스트ㅋㅋㅋㅋ',
//         allowAnonymous: false
//     })).toHaveProperty('rowCount', 1);
//done();
// });


test('get documents', async(done) => {
    let document = await documentModel.getDocuments('free');

    expect(document).toHaveLength(3);
    expect(await documentModel.getDocuments(null, document[0].documentId)).toEqual([]); //boardId is required
    expect(await documentModel.getDocuments('free')).toEqual(document); //free board first page
    expect(await documentModel.getDocuments('free', document[0].documentId)).toEqual(document); //free board around documentId
    expect(await documentModel.getDocuments(['free'])).toEqual(document); //free board (list)
    expect(await documentModel.getDocuments('free', null, '쌤', 'title')).toHaveLength(1); //serarch for title
    expect(await documentModel.getDocuments('free', null, '테스트', 'titleContents')).toHaveLength(2); //search for titleContents
    expect(await documentModel.getDocuments('free', null, '쿄쿄쿄', 'contents')).toHaveLength(1); //search for titleContents
    const reverse = (await documentModel.getDocuments('free', null, null, null, null, true)).reverse();
    expect(reverse).toEqual(document); //sort reverse
    expect(await documentModel.getDocuments('free', null, null, null, null, false, 2)).toHaveLength(0); //2page : nothing
    expect(await documentModel.getDocuments('free', document[0].documentId, null, null, null, false, 2)); //1 page even if page number specified because there is document Id
    done();
});

test('create document', async(done) => {
    expect(await documentModel.createDocument({
        boardId: 'free',
        userId: 'blue',
        isAnonymous: false,
        title: '신나는 개발놀이!',
        contents: '쿄ㅋ쿄쿄',
        allowAnonymous: false
    })).toHaveProperty('rowCount', 1);
    done();
});

test('get document', async(done) => {
    const document = await documentModel.getDocuments('free');
    expect(document.length).toBeGreaterThan(2);
    expect((await documentModel.getDocument(document[0].documentId))[0].documentId).toEqual(document[0].documentId);
    done();
});

test('update document', async(done) => {
    let document = await documentModel.getDocuments('nofree');
    //document = document[0];
    let first = {...document[0] };
    first.title = '바뀐 제목입니다.';
    first.restriction = JSON.stringify({ 'test': 'aaa' });
    first.isDeleted = true;
    expect(await documentModel.updateDocument(first)).toEqual(1);
    let document2 = (await documentModel.getDocument(first.documentId))[0];
    expect(first.title).toEqual(document2.title);
    expect(JSON.parse(first.restriction)).toEqual(document2.restriction);

    expect((await documentModel.getDocuments('nofree')).length).toBeLessThan(document.length); //deleted -> not selected
    expect(await documentModel.updateDocument({ isDeleted: false, ...document[0] })).toEqual(1); //restore original statue
    done();
});

test('get best document and delete document', async(done) => {
    let document = await documentModel.getDocuments('free');
    for (let i = 0; i < document.length; i++) {
        document[i].bestDateTime = document[i].writeDateTime;
        expect(await documentModel.updateDocument(document[i])).toEqual(1);
    }

    const docs = await documentModel.getBestDocuments('free', document[0].documentId);
    expect(docs).toHaveLength(document.length);
    expect(await documentModel.getBestDocuments('free')).toEqual(docs);
    expect(await documentModel.getBestDocuments(null, null, 'L')).toEqual(docs); //if there is only one lounge board(free)
    expect(await documentModel.getBestDocuments(null, null, 'L', document[0].title, 'title')).toHaveLength(1);
    expect(await documentModel.getBestDocuments('free', document[0].documentId)).toEqual(docs);
    expect(await documentModel.getBestDocuments('free', null, null, null, null, 2)).toHaveLength(0);

    for (let i = 0; i < document.length; i++) {
        document[i].bestDateTime = null;
        await documentModel.updateDocument(document[i]);
    }

    const doa = await documentModel.getDocuments('free', null, '신나', 'title');
    expect(doa).toHaveLength(1);
    expect(await documentModel.deleteDocument(doa[0].documentId)).toEqual(1);
    done();
});

test('get user document', async(done) => {
    expect(await documentModel.getUserDocument('blue', 2)).toHaveLength(0);
    expect((await documentModel.getUserDocument('blue', 1)).length).toBeGreaterThan(0);
    done();
})

test('get nickname document', async(done) => {
    expect(await documentModel.getNickNameDocument('41f7', 'T')).toHaveLength(1);
    done();
});
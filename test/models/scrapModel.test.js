/* global expect */
const scrapModel = require('../../server/models/scrapModel'),
    documentModel = require('../../server/models/documentModel');

// test('create scrap - init', async(done) => {
//     const documents = await documentModel.getDocuments(['free', 'nofree']);
//     let i = 0;
//     const result = await scrapModel.createScrapGroup('orange', 'scrapGroup1');
//     expect(result).toHaveProperty('rowCount', 1);
//     while (i < documents.length && i < 3) {
//         expect(await scrapModel.createScrap('orange', result.rows[0].scrapGroupId, documents[i].documentId)).toEqual(1);
//         i++;
//     }
//     const result2 = await scrapModel.createScrapGroup('blue', 'blueScrapGroup1');
//     expect(result2).toHaveProperty('rowCount', 1);
//done();
// });

test('get scrap group', async(done) => {
    expect(await scrapModel.getScrapGroupByUserId('orange')).toHaveLength(1);
    done();
});

test('get scraps', async(done) => {
    const scrapGroup = (await scrapModel.getScrapGroupByUserId('orange'))[0];

    expect((await scrapModel.getScraps('orange', scrapGroup.scrapGroupId)).length).toBeGreaterThan(1);
    expect(await scrapModel.getScraps('orange', 123)).toHaveLength(0);
    expect(await scrapModel.getScraps('blue', 1)).toHaveLength(0);
    expect(await scrapModel.getScraps('orange', scrapGroup.scrapGroupId, 2)).toHaveLength(0);
    done();
});

test('create and delete Scrap', async(done) => {
    const documents = await documentModel.getDocuments(['free', 'nofree']);
    const scrapGroup = (await scrapModel.getScrapGroupByUserId('blue'))[0];
    expect(await scrapModel.createScrap('blue', scrapGroup.scrapGroupId, documents[0].documentId)).toEqual(1);
    expect(await scrapModel.deleteScrap('blue', scrapGroup.scrapGroupId, documents[0].documentId)).toEqual(1);
    done();
});

test('create, get, update, delete scrap group', async(done) => {
    const scrapGroup = (await scrapModel.createScrapGroup('blue', 'testgroup'));
    expect(scrapGroup).toHaveProperty('rowCount', 1);
    expect((await scrapModel.getScrapGroup('blue', scrapGroup.rows[0].scrapGroupId))[0].scrapGroupId).toEqual(scrapGroup.rows[0].scrapGroupId);
    expect(await scrapModel.updateScrapGroup('blue', scrapGroup.rows[0].scrapGroupId, '바뀐 이름!')).toEqual(1);
    expect((await scrapModel.getScrapGroup('blue', scrapGroup.rows[0].scrapGroupId))[0]).toHaveProperty('scrapGroupName', '바뀐 이름!');

    const documents = await documentModel.getDocuments(['free']);
    expect(await scrapModel.createScrap('blue', scrapGroup.rows[0].scrapGroupId, documents[0].documentId)).toEqual(1);
    expect(await scrapModel.deleteScrapGroup('blue', scrapGroup.rows[0].scrapGroupId)).toEqual(1);
    expect(await scrapModel.getScraps('blue', scrapGroup.rows[0].scrapGroupId)).toHaveLength(0);
    done();
});
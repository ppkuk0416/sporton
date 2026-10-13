const {test}=require('node:test');
const assert=require('node:assert/strict');
const board=require('../watchboard.js');
const match=(id,leagueId='nba',rawDate='2026-10-13')=>({id,leagueId,rawDate,homeScore:42,awayScore:50});
test('four pin limit, removing a pin, distinct league/date identities',()=>{
    let pins=[];
    for(const m of [match('1'),match('1','kbl'),match('1','nba','2026-10-14'),match('2')])pins=board.toggle(pins,m);
    assert.equal(pins.length,4);
    assert.equal(board.toggle(pins,match('3')),pins);
    pins=board.toggle(pins,match('1'));assert.equal(pins.length,3);
    assert.equal(board.toggle(pins,match('3')).length,4);
});
test('restoration rejects corrupt entries, deduplicates and stores identities only',()=>{
    assert.deepEqual(board.restore('broken'),[]);
    assert.deepEqual(board.restore('{}'),[]);
    const restored=board.restore(JSON.stringify([match('1'),match('1'),null,match('2','nba','bad'),{...match('2'),id:2}]));
    assert.deepEqual(restored,[{id:'1',leagueId:'nba',rawDate:'2026-10-13'}]);
    assert.deepEqual(board.toggle([],match(4)),[{id:'4',leagueId:'nba',rawDate:'2026-10-13'}]);
    assert.equal('homeScore' in restored[0],false);
});

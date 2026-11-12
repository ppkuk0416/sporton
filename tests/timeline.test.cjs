'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {groupByStartTime}=require('../sports-core.js');
test('timeline groups actual instants across timezones and leagues without changing source records',()=>{
    const late={id:'same',leagueId:'nba',isoDate:'2026-11-12T01:30:00Z',status:'live'};
    const early={id:'same',leagueId:'kleague',isoDate:'2026-11-12T09:00:00+09:00',status:'finished'};
    const equal={id:'third',leagueId:'nba',isoDate:'2026-11-12T00:00:45Z',status:'upcoming'};
    const unknown={id:'unknown',leagueId:'nba',isoDate:null};
    const input=[late,unknown,equal,early],before=JSON.stringify(input);
    const groups=groupByStartTime(input);
    assert.equal(groups.length,3);
    assert.equal(groups[0].startsAt,Date.parse('2026-11-12T00:00:00Z'));
    assert.deepEqual(groups[0].matches,[early,equal]);
    assert.equal(groups[1].matches[0],late);
    assert.equal(groups[2].startsAt,null);
    assert.equal(groups[2].matches[0],unknown);
    assert.equal(JSON.stringify(input),before);
});

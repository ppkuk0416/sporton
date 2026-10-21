'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {fresh,validDate,assertSnapshot}=require('../ai-dashboard.js');
const {assertCollections}=require('../ai-engine/pipeline.cjs');
const code=fs.readFileSync('ai-dashboard.js','utf8');
const snapshot=()=>({version:1,date:'2026-10-21',generatedAt:new Date().toISOString(),status:{leagues:[{code:'kbl',name:'KBL',completed_games:9},{code:'nba',name:'NBA',completed_games:15}]},performance:{models:[]},predictions:{kbl:{predictions:[]},nba:{predictions:[]}}});
function dashboard(fetcher){
    const root={innerHTML:'',setAttribute(){},querySelectorAll:()=>[],querySelector:()=>({})};
    const window={SPORTON_CONFIG:{domesticApiBase:'https://api.example'}};
    vm.runInNewContext(code,{window,document:{getElementById:()=>root,addEventListener(){}},location:{hostname:'sporton.live',search:'?date=2026-10-21',href:'https://sporton.live/ai'},URLSearchParams,URL,Date,Number,AbortSignal,fetch:fetcher,history:{replaceState(){}}});
    return {app:window.SportonAI,root};
}
test('stale and future snapshot timestamps cannot appear current',()=>{
    const now=Date.parse('2026-10-21T00:00:00Z');
    assert.equal(fresh('2026-10-20T23:00:00Z',now),true);
    assert.equal(fresh('2026-10-20T00:00:00Z',now),false);
    assert.equal(fresh('2026-10-22T00:00:00Z',now),false);
    assert.equal(fresh('invalid',now),false);
    assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2026-10-21'),true);
    assert.throws(()=>assertSnapshot({version:1}),/INVALID_SNAPSHOT/);
});
test('schedule survives snapshot outage and controls remain available when both fail',async()=>{
    const {app,root}=dashboard(async url=>{
        if(url.includes('snapshot.json'))throw Error('offline');
        return {ok:true,json:async()=>({feeds:[{leagueId:'kbl',state:'ok',fetchedAt:new Date().toISOString(),matches:[{leagueId:'kbl',rawDate:'2026-10-21',status:'upcoming',awayTeam:'Away <script>',homeTeam:'Home',isoDate:'2026-10-21T10:00:00Z',homeScore:null,awayScore:null}]}]})};
    });
    await app.load();assert.match(root.innerHTML,/Away &lt;script&gt;/);assert.match(root.innerHTML,/— : —/);assert.match(root.innerHTML,/분석 자료를 불러오지/);assert.match(root.innerHTML,/data-ai-refresh/);
    const failed=dashboard(async()=>{throw Error('offline');});await failed.app.load();assert.match(failed.root.innerHTML,/경기 정보를 불러오지/);assert.match(failed.root.innerHTML,/id="aiDate"/);
});
test('late response from the previous league cannot overwrite current selection',async()=>{
    let release,started=false;
    const delayed=new Promise(resolve=>release=resolve);
    const {app,root}=dashboard(async url=>{
        if(url.includes('snapshot.json'))return {ok:true,json:async()=>snapshot()};
        if(url.includes('domestic')){started=true;await delayed;return {ok:true,json:async()=>({feeds:[{leagueId:'kbl',state:'ok',matches:[]}]})};}
        return {ok:true,json:async()=>({leagueId:'nba',state:'ok',matches:[]})};
    });
    const first=app.load();assert.equal(started,true);app.league='nba';await app.load();release();await first;
    assert.match(root.innerHTML,/NBA 경기 일정/);assert.doesNotMatch(root.innerHTML,/KBL 경기 일정/);
});
test('failed and partial collections stop publication of a new verified timestamp',()=>{
    assert.doesNotThrow(()=>assertCollections({kbl:{state:'succeeded'},nba:{state:'succeeded'}}));
    assert.throws(()=>assertCollections({kbl:{state:'failed'}}),/last verified/);
    assert.throws(()=>assertCollections({nba:{state:'partial'}}),/last verified/);
});

'use strict';
const C=require('../sports-core.js');
const D=require('../score-details.js');
const cache=new Map(),pending=new Map();
async function request(url,fetcher) {
    const res=await fetcher(url,{signal:AbortSignal.timeout(8000),headers:{Accept:'application/json',Referer:'https://m.sports.naver.com/'}});
    if(!res.ok)throw Error('Source '+res.status);return res.json();
}
function validRequest(leagueId,id) {
    const l=C.LEAGUES.find(l=>l.id===leagueId);
    return !!l&&typeof id==='string'&&(l.region==='world'?/^\d{6,14}$/:/^[A-Za-z0-9_-]{8,48}$/).test(id);
}
async function getDetail(leagueId,id,fetcher=fetch) {
    if(!validRequest(leagueId,id))throw Error('Invalid detail request');
    const l=C.LEAGUES.find(l=>l.id===leagueId),key=leagueId+':'+id,old=cache.get(key);
    if(old&&Date.now()-old.at<4000)return old.value;
    if(pending.has(key))return pending.get(key);
    const task=(async()=>{
        let detail;
        if(l.region==='kr') {
            const base='https://api-gw.sports.naver.com/schedule/games/'+encodeURIComponent(id);
            const results=await Promise.allSettled([request(base,fetcher),request(base+'/record',fetcher)]);
            if(results[0].status!=='fulfilled')throw Error('Game unavailable');
            if(results[0].value.result?.game?.gameId!==id)throw Error('Game mismatch');
            detail=D.naver(results[0].value,results[1].status==='fulfilled'?results[1].value:null,l);
            detail.recordState=results[1].status==='fulfilled'?'ok':'error';
        } else {
            detail=D.espn(await request('https://site.api.espn.com/apis/site/v2/sports/'+l.path+'/summary?event='+id,fetcher),l,id);
        }
        const value={version:1,leagueId,matchId:id,source:l.region==='kr'?'네이버 스포츠':'ESPN',state:'ok',fetchedAt:new Date().toISOString(),...detail};
        cache.set(key,{at:Date.now(),value});if(cache.size>128)cache.delete(cache.keys().next().value);return value;
    })().catch(()=>old&&Date.now()-Date.parse(old.value.fetchedAt)<900000?{...old.value,state:'stale'}:{version:1,leagueId,matchId:id,state:'error',fetchedAt:null,match:null,periods:null,events:[],stats:[],error:'상세 기록 연결 실패'}).finally(()=>pending.delete(key));
    pending.set(key,task);return task;
}
module.exports={getDetail,validRequest};

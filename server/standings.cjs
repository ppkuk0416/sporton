'use strict';
const core=require('../sports-core.js');
const standings=require('../football-standings.js');
async function collectStandings(id,fetcher=fetch){
 const league=core.LEAGUES.find(l=>l.sport==='soccer'&&l.id===id);if(!league)throw Error('Unsupported standings league');
 async function get(url){const r=await fetcher(url,{headers:{Accept:'application/json',Referer:'https://m.sports.naver.com/'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Standings source unavailable');return r.json();}
 let groups,source;
 if(league.region==='kr'){source='네이버 스포츠';const base='https://api-gw.sports.naver.com/statistics/categories/'+id;const season=standings.seasonCode(await get(base+'/seasons'),Number(core.kstDate().slice(0,4)));groups=standings.naver(await get(base+'/seasons/'+season+'/teams'),season);}
 else{source='ESPN';groups=standings.espn(await get('https://site.api.espn.com/apis/v2/sports/soccer/'+id+'/standings'));}
 return{version:1,leagueId:id,name:league.name,source,state:'ok',fetchedAt:new Date().toISOString(),groups};
}
module.exports={collectStandings};

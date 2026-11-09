'use strict';
const core=require('../sports-core.js');
const standings=require('../football-standings.js');
async function collectStandings(id,fetcher=fetch){
 const league=core.LEAGUES.find(l=>l.sport==='soccer'&&l.id===id);if(!league)throw Error('Unsupported standings league');
 async function get(url){const r=await fetcher(url,{headers:{Accept:'application/json',Referer:'https://m.sports.naver.com/'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Standings source unavailable');return r.json();}
 let groups,source,sourceUrl;
 if(league.region==='kr'){source='네이버 스포츠';const base='https://api-gw.sports.naver.com/statistics/categories/'+id;const season=standings.seasonCode(await get(base+'/seasons'),Number(core.kstDate().slice(0,4)));sourceUrl=base+'/seasons/'+season+'/teams';groups=standings.naver(await get(sourceUrl),season);}
 else{source='ESPN';sourceUrl='https://site.api.espn.com/apis/v2/sports/soccer/'+id+'/standings';groups=standings.espn(await get(sourceUrl));}
 const value={version:1,leagueId:id,name:league.name,source,sourceUrl,provider:league.source,state:'ok',fetchedAt:new Date().toISOString(),groups};
 const quality=standings.inspect(value,id,{requireIdentity:true});
 if(!quality.valid)throw Error('Invalid standings: '+quality.issues.map(x=>x.code).join(', '));
 return {...value,quality:{status:'schema-validated',identityVerified:true,checkedAt:new Date().toISOString()}};
}
module.exports={collectStandings};

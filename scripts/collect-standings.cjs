'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),core=require('../sports-core.js'),{collectStandings}=require('../server/standings.cjs');
async function collectTables(directory=path.resolve(__dirname,'../data/standings')){
 await fs.mkdir(directory,{recursive:true});const leagues=core.LEAGUES.filter(l=>l.sport==='soccer'),results=[];
 for(let i=0;i<leagues.length;i+=2)await Promise.all(leagues.slice(i,i+2).map(async l=>{
  const target=path.join(directory,l.id+'.json');
  try{const data=await collectStandings(l.id);await fs.writeFile(target,JSON.stringify(data)+'\n');results.push({id:l.id,state:'ok',teams:data.groups.reduce((n,g)=>n+g.entries.length,0)});}
  catch{let previous;try{previous=JSON.parse(await fs.readFile(target,'utf8'));}catch{}if(previous?.leagueId===l.id&&previous.groups?.length)await fs.writeFile(target,JSON.stringify({...previous,state:'stale'})+'\n');results.push({id:l.id,state:'error'});}
 }));
 console.log('Football standings: '+JSON.stringify(results));return results;
}
if(require.main===module)collectTables().then(results=>{if(results.every(r=>r.state==='error'))process.exitCode=1;}).catch(()=>{console.error('Standings collection failed');process.exitCode=1;});
module.exports={collectTables};

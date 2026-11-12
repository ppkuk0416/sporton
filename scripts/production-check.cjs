'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../sports-core.js');

async function checkProduction(fetcher=fetch) {
    const site='https://sporton.live',api='https://sporton-live-api.parkbeomkuk.chatgpt.site';
    const expected=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
    const assets=[...expected.matchAll(/(?:src|href)="\/(\w[\w.-]*\.(js|css)\?v=[^"]+)"/g)];
    async function request(url,options={}) {
        return fetcher(url,{...options,signal:AbortSignal.timeout(15000),headers:{Origin:site,...options.headers}});
    }
    const checks=[
        ['homepage and release',async()=>{
            const r=await request(site);assert.equal(r.status,200);const html=await r.text();
            assert.match(html,/id="homeGamesContainer"/);
            assert.doesNotMatch(html,/href="\/ai(?:\.html)?"|id="aiDashboard"/);
            for(const match of assets)assert.ok(html.includes(match[1]),'Public homepage is behind the checked-out release: '+match[1]);
        }],
        ['score assets',async()=>{
            for(const match of assets){const r=await request(site+'/'+match[1]);assert.equal(r.status,200,match[1]);assert.match(r.headers.get('content-type')||'',match[2]==='js'?/javascript/:/text\/css/);}
        }],
        ['retired AI page',async()=>{
            const r=await request(site+'/ai.html',{redirect:'manual'});
            assert.ok([301,302,307,308].includes(r.status),'Retired page must redirect to the scoreboard');
            assert.equal(new URL(r.headers.get('location'),site).pathname,'/');
        }],
        ['API health',async()=>{const r=await request(api+'/api/health');assert.equal(r.status,200);assert.equal((await r.json()).status,'ok');assert.equal(r.headers.get('access-control-allow-origin'),site);}],
        ['domestic feeds',async()=>{
            const today=core.kstDate(),r=await request(api+'/api/domestic?from='+today+'&to='+today);assert.equal(r.status,200);const data=await r.json();
            assert.ok(Array.isArray(data.feeds),'Domestic feed list missing');
            const bad=core.LEAGUES.filter(l=>l.region==='kr').filter(l=>{const f=data.feeds.find(f=>f.leagueId===l.id),age=Date.now()-Date.parse(f?.fetchedAt);return !f||f.state!=='ok'||!Number.isFinite(age)||age< -30000||age>120000;});
            assert.equal(bad.length,0,'Domestic unavailable or stale: '+bad.map(l=>l.name).join(', '));
        }],
        ['invalid date rejection',async()=>assert.equal((await request(api+'/api/domestic?from=2026-02-30')).status,400)],
        ['origin rejection',async()=>assert.equal((await request(api+'/api/domestic',{headers:{Origin:'https://invalid.example'}})).status,403)],
        ['source isolation',async()=>assert.equal((await request(api+'/.env')).status,404)]
    ];
    const results=await Promise.all(checks.map(async([name,run])=>{try{await run();return {name,ok:true};}catch(error){return {name,ok:false,error:error.message};}}));
    return {checkedAt:new Date().toISOString(),ok:results.every(r=>r.ok),results};
}
if(require.main===module)checkProduction().then(report=>{console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;}).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={checkProduction};

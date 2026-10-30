'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {assertSnapshot,fresh}=require('../ai-dashboard.js');
const core=require('../sports-core.js');

async function checkProduction(fetcher=fetch) {
    const site='https://sporton.live',api='https://sporton-live-api.parkbeomkuk.chatgpt.site';
    async function request(url,options={}) {
        const r=await fetcher(url,{...options,signal:AbortSignal.timeout(15000),headers:{Origin:site,...options.headers}});
        return r;
    }
    const checks=[
        ['homepage',async()=>{const r=await request(site);assert.equal(r.status,200);assert.match(await r.text(),/href="\/ai(?:\.html)?"/);}],
        ['AI page and release',async()=>{
            const r=await request(site+'/ai.html');assert.equal(r.status,200);const html=await r.text();assert.match(html,/id="aiDashboard"/);
            const expected=fs.readFileSync(path.join(__dirname,'../ai.html'),'utf8');
            for(const match of expected.matchAll(/\/(ai-dashboard\.(?:js|css)\?v=[^"]+)/g))assert.ok(html.includes(match[1]),'Public AI page is behind the checked-out release: '+match[1]);
        }],
        ['AI assets',async()=>{
            const expected=fs.readFileSync(path.join(__dirname,'../ai.html'),'utf8');
            for(const match of expected.matchAll(/\/(ai-dashboard\.(js|css)\?v=[^"]+)/g)){
                const r=await request(site+'/'+match[1]);assert.equal(r.status,200);assert.match(r.headers.get('content-type')||'',match[2]==='js'?/javascript/:/text\/css/);
            }
        }],
        ['AI data freshness',async()=>{const r=await request(site+'/data/ai/snapshot.json');assert.equal(r.status,200);const s=assertSnapshot(await r.json());assert.ok(fresh(s.generatedAt),'AI snapshot older than 12 hours or timestamp invalid');}],
        ['API health',async()=>{const r=await request(api+'/api/health');assert.equal(r.status,200);assert.equal((await r.json()).status,'ok');assert.equal(r.headers.get('access-control-allow-origin'),site);}],
        ['domestic feeds',async()=>{const today=core.kstDate(),r=await request(api+'/api/domestic?from='+today+'&to='+today);assert.equal(r.status,200);const data=await r.json();const expected=core.LEAGUES.filter(l=>l.region==='kr');assert.ok(Array.isArray(data.feeds),'Domestic feed list missing');const bad=expected.filter(l=>{const feed=data.feeds.find(f=>f.leagueId===l.id);const age=Date.now()-Date.parse(feed?.fetchedAt);return !feed||feed.state!=='ok'||!Number.isFinite(age)||age< -30000||age>120000;});assert.equal(bad.length,0,'Domestic unavailable or stale: '+bad.map(l=>l.name).join(', '));}],
        ['AI API',async()=>{const r=await request(api+'/api/ai/status');assert.equal(r.status,200);assert.ok(fresh((await r.json()).generatedAt),'AI API data is stale');}],
        ['invalid date rejection',async()=>assert.equal((await request(api+'/api/ai/predictions?league=kbl&date=2026-02-30')).status,400)],
        ['origin rejection',async()=>assert.equal((await request(api+'/api/ai/status',{headers:{Origin:'https://invalid.example'}})).status,403)],
        ['source isolation',async()=>assert.equal((await request(api+'/.env')).status,404)]
    ];
    const results=await Promise.all(checks.map(async([name,run])=>{try{await run();return {name,ok:true};}catch(error){return {name,ok:false,error:error.message};}}));
    return {checkedAt:new Date().toISOString(),ok:results.every(r=>r.ok),results};
}
if(require.main===module)checkProduction().then(report=>{console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;}).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={checkProduction};

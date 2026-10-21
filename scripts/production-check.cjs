'use strict';
const assert=require('node:assert/strict');
const {assertSnapshot,fresh}=require('../ai-dashboard.js');

async function checkProduction(fetcher=fetch) {
    const site='https://sporton.live',api='https://sporton-live-api.parkbeomkuk.chatgpt.site';
    async function request(url,options={}) {
        const r=await fetcher(url,{...options,signal:AbortSignal.timeout(15000),headers:{Origin:site,...options.headers}});
        return r;
    }
    const checks=[
        ['homepage',async()=>{const r=await request(site);assert.equal(r.status,200);assert.match(await r.text(),/href="\/ai(?:\.html)?"/);}],
        ['AI page',async()=>{const r=await request(site+'/ai.html');assert.equal(r.status,200);assert.match(await r.text(),/id="aiDashboard"/);}],
        ['AI data freshness',async()=>{const r=await request(site+'/data/ai/snapshot.json');assert.equal(r.status,200);const s=assertSnapshot(await r.json());assert.ok(fresh(s.generatedAt),'AI snapshot older than 12 hours or timestamp invalid');}],
        ['API health',async()=>{const r=await request(api+'/api/health');assert.equal(r.status,200);assert.equal((await r.json()).status,'ok');assert.equal(r.headers.get('access-control-allow-origin'),site);}],
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

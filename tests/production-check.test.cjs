'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {checkProduction}=require('../scripts/production-check.cjs');
const C=require('../sports-core.js');
test('production monitor detects an old release even when every page returns HTTP 200',async()=>{
    const html=fs.readFileSync('ai.html','utf8');let old=false,badDomestic=false;
    const fetcher=async(url,options)=>{
        const u=new URL(url),headers={'access-control-allow-origin':'https://sporton.live'};
        if(u.pathname==='/api/ai/predictions')return new Response('{}',{status:400,headers});
        if(u.pathname==='/.env')return new Response('{}',{status:404,headers});
        if(options.headers.Origin==='https://invalid.example')return new Response('{}',{status:403});
        if(u.pathname==='/api/health')return Response.json({status:'ok'},{headers});
        if(u.pathname==='/api/domestic')return Response.json({feeds:C.LEAGUES.filter(l=>l.region==='kr').map(l=>({leagueId:l.id,state:badDomestic&&l.id==='kbo'?'error':'ok',fetchedAt:new Date().toISOString()}))},{headers});
        if(u.pathname==='/api/ai/status')return Response.json({generatedAt:new Date().toISOString()},{headers});
        if(u.pathname==='/data/ai/snapshot.json')return Response.json({version:1,date:'2026-10-21',generatedAt:new Date().toISOString(),status:{leagues:[]},performance:{models:[]},predictions:{kbl:{predictions:[]},nba:{predictions:[]}}});
        if(u.pathname.endsWith('.js')||u.pathname.endsWith('.css'))return new Response('',{headers:{'Content-Type':u.pathname.endsWith('.js')?'text/javascript':'text/css'}});
        return new Response(u.pathname==='/'?'<a href="/ai.html">AI</a>':old?html.replaceAll('20261021-users1','old'):html);
    };
    assert.equal((await checkProduction(fetcher)).ok,true);old=true;
    const report=await checkProduction(fetcher);assert.equal(report.ok,false);assert.equal(report.results.find(r=>r.name==='AI page and release').ok,false);
    old=false;badDomestic=true;const domestic=await checkProduction(fetcher);assert.equal(domestic.ok,false);assert.match(domestic.results.find(r=>r.name==='domestic feeds').error,/KBO/);assert.equal(domestic.results.find(r=>r.name==='API health').ok,true);
});

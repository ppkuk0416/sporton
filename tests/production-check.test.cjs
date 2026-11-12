'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {checkProduction}=require('../scripts/production-check.cjs');
const C=require('../sports-core.js');
test('production monitor detects old score releases and domestic outages without requiring retired AI services',async()=>{
    const html=fs.readFileSync('index.html','utf8');let old=false,badDomestic=false;
    const fetcher=async(url,options)=>{
        const u=new URL(url),headers={'access-control-allow-origin':'https://sporton.live'};
        if(u.pathname==='/ai.html')return new Response(null,{status:302,headers:{Location:'/'}});
        if(u.pathname==='/.env')return new Response('{}',{status:404,headers});
        if(options.headers.Origin==='https://invalid.example')return new Response('{}',{status:403});
        if(u.pathname==='/api/health')return Response.json({status:'ok'},{headers});
        if(u.pathname==='/api/domestic'&&u.searchParams.get('from')==='2026-02-30')return new Response('{}',{status:400,headers});
        if(u.pathname==='/api/domestic')return Response.json({feeds:C.LEAGUES.filter(l=>l.region==='kr').map(l=>({leagueId:l.id,state:badDomestic&&l.id==='kbo'?'error':'ok',fetchedAt:new Date().toISOString()}))},{headers});
        if(u.pathname.endsWith('.js')||u.pathname.endsWith('.css'))return new Response('',{headers:{'Content-Type':u.pathname.endsWith('.js')?'text/javascript':'text/css'}});
        assert.equal(u.pathname,'/','Unexpected monitored endpoint');
        return new Response(old?html.replace(/v=[^" ]+/g,'v=old'):html);
    };
    assert.equal((await checkProduction(fetcher)).ok,true);old=true;
    const report=await checkProduction(fetcher);assert.equal(report.ok,false);assert.equal(report.results.find(r=>r.name==='homepage and release').ok,false);
    old=false;badDomestic=true;const domestic=await checkProduction(fetcher);assert.equal(domestic.ok,false);assert.match(domestic.results.find(r=>r.name==='domestic feeds').error,/KBO/);assert.equal(domestic.results.find(r=>r.name==='API health').ok,true);
});

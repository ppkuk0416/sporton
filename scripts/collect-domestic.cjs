'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const core = require('../sports-core.js');
const { collect } = require('../server/domestic.cjs');
const { collectLeague }=require('../server/overseas.cjs');
async function main() {
    const today = process.env.SCORE_DATE || core.kstDate();
    const dates = Array.from({ length: 8 }, (_, i) => core.shiftDate(today, i - 1));
    const payload = await collect(dates[0], dates.at(-1));
    const directory = path.resolve(__dirname, '../data/domestic');
    await fs.mkdir(directory, { recursive: true });
    for (const date of dates) {
        const target = path.join(directory, date + '.json');
        let previous;
        try { previous = JSON.parse(await fs.readFile(target, 'utf8')); } catch {}
        const feeds = payload.feeds.map(feed => {
            if (feed.state === 'error') {
                const good = previous?.feeds?.find(f => f.leagueId === feed.leagueId && ['ok', 'stale'].includes(f.state));
                if (good) return { ...good, state: 'stale', error: feed.error };
            }
            return { ...feed, matches: feed.matches.filter(m => m.rawDate === date) };
        });
        const value = { ...payload, from: date, to: date, feeds };
        await fs.writeFile(target, JSON.stringify(value) + '\n');
    }
    for (const file of await fs.readdir(directory)) {
        if (/^\d{4}-\d{2}-\d{2}\.json$/.test(file) && file.slice(0, 10) < core.shiftDate(today, -7))
            await fs.unlink(path.join(directory, file));
    }
    const worldDir=path.resolve(__dirname,'../data/overseas');
    await fs.mkdir(worldDir,{recursive:true});
    // Four leagues at a time. Adjacent KST days reuse the same UTC scoreboard requests.
    const jobs=dates.flatMap(date=>core.LEAGUES.filter(l=>l.region==='world').map(l=>({date,id:l.id})));
    const feedsByDate=new Map(dates.map(date=>[date,[]]));
    for(let i=0;i<jobs.length;i+=4) {
        await Promise.all(jobs.slice(i,i+4).map(async job=>{
            let feed=await collectLeague(job.id,job.date);
            if(feed.state==='error') {
                try { const old=JSON.parse(await fs.readFile(path.join(worldDir,job.date+'.json'),'utf8')); const good=old.feeds.find(f=>f.leagueId===job.id&&f.state!=='error'); if(good)feed={...good,state:'stale'}; } catch {}
            }
            feedsByDate.get(job.date).push(feed);
        }));
    }
    for(const [date,feeds]of feedsByDate) await fs.writeFile(path.join(worldDir,date+'.json'),JSON.stringify({version:1,source:'ESPN',generatedAt:new Date().toISOString(),from:date,to:date,feeds})+'\n');
    for(const file of await fs.readdir(worldDir)) {
        if(/^\d{4}-\d{2}-\d{2}\.json$/.test(file)&&file.slice(0,10)<core.shiftDate(today,-7))await fs.unlink(path.join(worldDir,file));
    }
    console.log('ESPN games: '+[...feedsByDate.values()].flat().reduce((n,f)=>n+f.matches.length,0));
    const failures = payload.feeds.filter(f => f.state === 'error').map(f => f.name);
    console.log(JSON.stringify({ from: dates[0], to: dates.at(-1), games: payload.feeds.reduce((n, f) => n + f.matches.length, 0), failures }));
    if (failures.length === payload.feeds.length) process.exitCode = 1;
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });

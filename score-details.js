/* Strict, shared normalization for source-provided detail records. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./sports-core.js'));else root.SportonDetails=factory(root.SportonCore);})(typeof globalThis!=='undefined'?globalThis:this,function (C) {
    'use strict';
    const number=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;
    function periods(match, home, away, homeTotal, awayTotal) {
        if(match.status==='upcoming'||!Array.isArray(home)||!Array.isArray(away))return null;
        const count=Math.max(home.length,away.length);if(!count)return null;
        const labels=Array.from({length:count},(_,i)=>match.sport==='basketball'?i<4?'Q'+(i+1):'OT'+(i-3):match.sport==='baseball'?String(i+1):match.sport==='hockey'?i<3?'P'+(i+1):'OT'+(i-2):String(i+1));
        return {labels,home:labels.map((_,i)=>number(home[i])),away:labels.map((_,i)=>number(away[i])),homeTotal:number(homeTotal),awayTotal:number(awayTotal)};
    }
    function eventType(value) {
        const text=String(value||'').toLowerCase();
        if(/own.?goal|자책/.test(text))return 'own-goal';
        if(/red|dismissal|second.?yellow|퇴장/.test(text))return 'red';
        if(/yellow|경고/.test(text))return 'yellow';
        if(/goal|골/.test(text))return 'goal';
        return '';
    }
    function naver(gameData, recordData, league) {
        const game=gameData?.result?.game;
        if(gameData?.success!==true||game?.categoryId!==league.id)throw Error('Domestic game mismatch');
        const match=C.normalizeNaver({success:true,result:{games:[game]}},league)[0];if(!match)throw Error('Invalid domestic game');
        const r=recordData?.success===true?recordData.result?.recordData:null;
        let lines=null;
        if(match.sport==='baseball') {
            const home=r?.scoreBoard?.inn?.home || game.homeTeamScoreByInning;
            const away=r?.scoreBoard?.inn?.away || game.awayTeamScoreByInning;
            lines=periods(match,home,away,match.homeScore,match.awayScore);
            if(lines&&match.status==='live') {
                const inning=Number(String(game.currentInning||game.statusInfo).match(/\d+/)?.[0]);
                if(inning>0) { lines.home=lines.home.map((n,i)=>i>=inning||i===inning-1&&/초/.test(game.statusInfo)?null:n);lines.away=lines.away.map((n,i)=>i>=inning?null:n); }
            }
        } else if(match.sport==='basketball'&&r) {
            const home=[1,2,3,4].map(n=>r['homeQ'+n+'Score']),away=[1,2,3,4].map(n=>r['awayQ'+n+'Score']);
            if(Number(r.homeXScore)>0||Number(r.awayXScore)>0||/X|OT|연장/i.test(String(r.currentHalf))) {home.push(r.homeXScore);away.push(r.awayXScore);}
            lines=periods(match,home,away,r.homeScore,r.awayScore);
            if(lines&&match.status==='live'&&/^Q[1-4]$/.test(r.currentHalf)) {
                const current=Number(r.currentHalf.slice(1));lines.home=lines.home.map((n,i)=>i>=current?null:n);lines.away=lines.away.map((n,i)=>i>=current?null:n);
            }
        }
        const events=Array.isArray(r?.timeline)?r.timeline.map(e=>({type:eventType(e.eventType),clock:String(e.time||''),side:['home','away'].includes(e.side)?e.side:'',text:String(e.text||'')})).filter(e=>e.type):[];
        const stats=match.sport==='soccer'&&r?['shooting','shotsOnGoal','ballPossession','yellow','dismissal'].map((key,i)=>({label:['슈팅','유효 슈팅','점유율 (%)','경고','퇴장'][i],home:number(r.home?.[key]),away:number(r.away?.[key])})).filter(s=>s.home!==null||s.away!==null):[];
        return {match,periods:lines,events,stats,recordAvailable:!!r};
    }
    function espn(data,league,id) {
        const header=data?.header, comp=header?.competitions?.[0];
        if(String(header?.id)!==String(id)||!comp)throw Error('ESPN game mismatch');
        const match=C.normalizeESPN({events:[{id:header.id,date:comp.date,competitions:[comp],status:comp.status,links:header.links}]},league)[0];
        if(!match)throw Error('Invalid ESPN game');
        const h=comp.competitors.find(c=>c.homeAway==='home'),a=comp.competitors.find(c=>c.homeAway==='away');
        const lines=periods(match,h.linescores?.map(l=>l.value??l.displayValue)||[],a.linescores?.map(l=>l.value??l.displayValue)||[],match.homeScore,match.awayScore);
        const events=Array.isArray(data.keyEvents)?data.keyEvents.map(e=>({type:eventType(e.type?.text)||({'100':'goal','93':'yellow','94':'red','92':'own-goal'}[String(e.type?.id)]||''),clock:String(e.clock?.displayValue||''),side:String(e.team?.id)===String(h.team.id)?'home':String(e.team?.id)===String(a.team.id)?'away':'',text:(e.athletesInvolved||[]).map(p=>p.displayName||p.shortName||'').filter(Boolean).join(' · ')})).filter(e=>e.type):[];
        return {match,periods:lines,events,stats:[],recordAvailable:!!lines||Array.isArray(data.keyEvents)};
    }
    return {naver,espn,periods,eventType};
});

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
        if(/corner.?kick|코너킥/.test(text))return 'corner';
        if(/goal.?kick|골킥/.test(text))return 'goal-kick';
        if(/shoot|shot|슈팅/.test(text))return 'shot';
        if(/goal|골/.test(text))return 'goal';
        return '';
    }
    const display=v=>v===null||v===undefined||v===''?null:String(v).slice(0,80);
    function domesticPlayers(record,sport) {
        const configs={
            baseball:[['타자','battersBoxscore',[['pos','포지션'],['ab','타수'],['hit','안타'],['hr','홈런'],['rbi','타점'],['run','득점']]],['투수','pitchersBoxscore',[['inn','이닝'],['hit','피안타'],['bb','볼넷'],['kk','탈삼진'],['r','실점'],['er','자책점'],['era','시즌 평균자책']]]],
            basketball:[['선수 기록',null,[['playTimeStr','출전'],['scoreTot','득점'],['reboundTot','리바운드'],['as','어시스트'],['st','스틸'],['bs','블록'],['to','턴오버']]]],
            soccer:[['선수 기록',null,[['position','포지션'],['goals','득점'],['assists','도움'],['shots','슈팅'],['shotsOnGoal','유효슈팅']]]],
            volleyball:[['선수 기록','playerStatOfGame',[['position','포지션'],['point','득점'],['attackSuccess','공격'],['blockingSuccess','블로킹'],['serveSuccess','서브'],['error','범실']]]]
        };
        const out=[];
        for(const [title,key,cols] of configs[sport]||[]) for(const side of ['away','home']) {
            const rows=key?record?.[key]?.[side]:record?.[side+'PlayerStats'];
            if(!Array.isArray(rows))continue;
            const entries=rows.filter(p=>p&&(p.playerName||p.name)).slice(0,80).map(p=>({name:String(p.playerName||p.name).slice(0,100),values:cols.map(([k])=>display(p[k]))}));
            if(entries.length)out.push({side,title,columns:cols.map(([,label])=>label),entries});
        }
        return out;
    }
    const ESPN_LABELS={totalShots:'슈팅',shotsOnTarget:'유효 슈팅',possessionPct:'점유율 (%)',wonCorners:'코너킥',foulsCommitted:'파울',yellowCards:'경고',redCards:'퇴장',totalRebounds:'리바운드',assists:'어시스트',steals:'스틸',blocks:'블록',turnovers:'턴오버',fieldGoalsMadeFieldGoalsAttempted:'야투',threePointFieldGoalsMadeThreePointFieldGoalsAttempted:'3점슛',freeThrowsMadeFreeThrowsAttempted:'자유투',hits:'안타',walks:'볼넷',homeRuns:'홈런',shotsTotal:'슈팅',shots:'슈팅',firstDowns:'퍼스트 다운',thirdDownEff:'서드 다운',totalYards:'총 야드',rushingYards:'러싱 야드',netPassingYards:'패싱 야드',powerPlayGoals:'파워플레이 골'};
    function espnStats(data,h,a) {
        const sideFor=t=>t?.homeAway==='home'||String(t?.team?.id)===String(h.team.id)?'home':t?.homeAway==='away'||String(t?.team?.id)===String(a.team.id)?'away':'';
        const byKey=new Map();
        for(const team of data?.boxscore?.teams||[]) {
            const side=sideFor(team);if(!side)continue;
            for(const item of team.statistics||[]) for(const stat of Array.isArray(item.stats)?(item.name==='pitching'||item.name==='fielding'?[]:item.stats):[item]) {
                const key=String(stat.name||'');const label=ESPN_LABELS[key]||ESPN_LABELS[key.replace(/[^A-Za-z]/g,'')];
                const value=display(stat.displayValue??stat.value);if(!label||value===null)continue;
                if(!byKey.has(key))byKey.set(key,{label,home:null,away:null});byKey.get(key)[side]=value;
            }
        }
        return [...byKey.values()];
    }
    function espnPlayers(data,h,a) {
        const groups=[];
        for(const team of data?.boxscore?.players||[]) {
            const id=String(team.team?.id||'');const side=id===String(h.team.id)?'home':id===String(a.team.id)?'away':'';if(!side)continue;
            for(const group of team.statistics||[]) {
                const cols=Array.isArray(group.labels)?group.labels.slice(0,20).map(x=>String(x).slice(0,30)):[];if(!cols.length)continue;
                const entries=(group.athletes||[]).filter(x=>x.athlete?.displayName&&Array.isArray(x.stats)).slice(0,80).map(x=>({name:String(x.athlete.displayName).slice(0,100),values:cols.map((_,i)=>display(x.stats[i]))}));
                const title=group.type==='batting'?'타자':group.type==='pitching'?'투수':group.name||group.displayName||'선수 기록';
                if(entries.length)groups.push({side,title:String(title).slice(0,60),columns:cols,entries});
            }
        }
        return groups;
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
        } else if(match.sport==='basketball') {
            const home=r?[1,2,3,4].map(n=>r['homeQ'+n+'Score']):game.homeTeamScoreByQuarter;
            const away=r?[1,2,3,4].map(n=>r['awayQ'+n+'Score']):game.awayTeamScoreByQuarter;
            if(r&&(Number(r.homeXScore)>0||Number(r.awayXScore)>0||/X|OT|연장/i.test(String(r.currentHalf)))) {home.push(r.homeXScore);away.push(r.awayXScore);}
            lines=periods(match,home,away,r?.homeScore??match.homeScore,r?.awayScore??match.awayScore);
            const current=Number(String(r?.currentHalf||game.currentQuarter||'').match(/(?:Q)?([1-4])/)?.[1]);
            if(lines&&match.status==='live'&&current>0&&!/X|OT|연장/i.test(String(r?.currentHalf||game.currentQuarter))) {
                lines.home=lines.home.map((n,i)=>i>=current?null:n);lines.away=lines.away.map((n,i)=>i>=current?null:n);
            }
        } else if(match.sport==='volleyball'&&Array.isArray(game.currentScoreBySet)) {
            const current=Number(game.currentSet);
            const sets=game.currentScoreBySet.filter(s=>Number.isInteger(Number(s.set))&&Number(s.set)>0&&Number(s.set)<=5).sort((a,b)=>Number(a.set)-Number(b.set));
            const count=Math.max(...sets.map(s=>Number(s.set)),0);
            const home=Array.from({length:count},(_,i)=>sets.find(s=>Number(s.set)===i+1)?.homeScore);
            const away=Array.from({length:count},(_,i)=>sets.find(s=>Number(s.set)===i+1)?.awayScore);
            lines=periods(match,home,away,match.homeScore,match.awayScore);
            if(lines&&current>0) {
                // Naver pads unplayed sets with 0; only sets at/before currentSet have been played.
                lines.home=lines.home.map((n,i)=>i>=current?null:n);lines.away=lines.away.map((n,i)=>i>=current?null:n);
            } else if(lines) {
                // Without a current set, padded zeros cannot establish whether a set was played.
                lines.home=lines.home.map((n,i)=>n===0&&lines.away[i]===0?null:n);
                lines.away=lines.away.map((n,i)=>n===0&&number(home[i])===0?null:n);
            }
        }
        const timeline=match.status!=='upcoming'&&Array.isArray(r?.timeline)?r.timeline.map(e=>({type:eventType(e.eventType),clock:String(e.time||''),side:['home','away'].includes(e.side)?e.side:'',text:String(e.text||'').slice(0,300)})).filter(e=>e.type):[];
        const events=timeline.filter((e,i)=>i>=timeline.length-50||['goal','own-goal','yellow','red'].includes(e.type)).slice(-200);
        const statFields={
            baseball:[['h','안타'],['e','실책'],['b','볼넷']],
            basketball:[['rebound','리바운드'],['aS','어시스트'],['sT','스틸'],['bS','블록'],['to','턴오버']],
            soccer:[['shooting','슈팅'],['shotsOnGoal','유효 슈팅'],['ballPossession','점유율 (%)'],['cornerKick','코너킥'],['foul','파울'],['offside','오프사이드'],['yellow','경고'],['dismissal','퇴장']],
            volleyball:[['attackSuccessCount','공격 득점'],['blockSuccessCount','블로킹 득점'],['serveSuccessCount','서브 득점'],['totalErrorCount','범실']]
        };
        const teamStats=match.sport==='baseball'?r?.scoreBoard?.rheb:match.sport==='volleyball'?r?.gameRecord:r;
        const stats=match.status!=='upcoming'?(statFields[match.sport]||[]).map(([key,label])=>({label,home:number(teamStats?.home?.[key]),away:number(teamStats?.away?.[key])})).filter(s=>s.home!==null||s.away!==null):[];
        return {match,periods:lines,events,stats,players:match.status==='upcoming'?[]:domesticPlayers(r,match.sport),recordAvailable:!!r};
    }
    function espn(data,league,id) {
        const header=data?.header, comp=header?.competitions?.[0];
        if(String(header?.id)!==String(id)||!comp)throw Error('ESPN game mismatch');
        const match=C.normalizeESPN({events:[{id:header.id,date:comp.date,competitions:[comp],status:comp.status,links:header.links}]},league)[0];
        if(!match)throw Error('Invalid ESPN game');
        const h=comp.competitors.find(c=>c.homeAway==='home'),a=comp.competitors.find(c=>c.homeAway==='away');
        const lines=periods(match,h.linescores?.map(l=>l.value??l.displayValue)||[],a.linescores?.map(l=>l.value??l.displayValue)||[],match.homeScore,match.awayScore);
        const scoring=match.sport==='soccer'?(data.keyEvents||[]):Array.isArray(data.scoringPlays)&&data.scoringPlays.length?data.scoringPlays:(data.plays||[]).filter(e=>e.scoringPlay===true);
        const events=match.status==='upcoming'?[]:scoring.slice(-50).map(e=>({type:match.sport==='soccer'?eventType(e.type?.text):'score',clock:String(e.clock?.displayValue||e.period?.displayValue||''),side:String(e.team?.id)===String(h.team.id)?'home':String(e.team?.id)===String(a.team.id)?'away':'',text:String(e.text||e.shortText||(e.participants||[]).map(p=>p.athlete?.displayName).filter(Boolean).join(' · ')||(e.athletesInvolved||[]).map(p=>p.displayName||p.shortName||'').filter(Boolean).join(' · ')).slice(0,300)})).filter(e=>e.type);
        const stats=match.status==='upcoming'?[]:espnStats(data,h,a),players=match.status==='upcoming'?[]:espnPlayers(data,h,a);
        return {match,periods:lines,events,stats,players,recordAvailable:!!lines||events.length>0||stats.length>0||players.length>0};
    }
    return {naver,espn,periods,eventType};
});

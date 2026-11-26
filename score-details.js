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
    Object.assign(ESPN_LABELS,{'fieldGoalsMade-fieldGoalsAttempted':'야투','threePointFieldGoalsMade-threePointFieldGoalsAttempted':'3점슛','freeThrowsMade-freeThrowsAttempted':'자유투',fieldGoalPct:'야투율 (%)',threePointFieldGoalPct:'3점슛 성공률 (%)',freeThrowPct:'자유투 성공률 (%)',offensiveRebounds:'공격 리바운드',defensiveRebounds:'수비 리바운드',pointsInPaint:'골밑 득점',fastBreakPoints:'속공 득점',largestLead:'최대 점수 차',leadPercentage:'리드 시간 (%)'});
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
    function soccerStats(data,h,a) {
        const rows=SOCCER_STATS.map(([key,label])=>({key,label,home:null,away:null}));
        for(const team of data?.boxscore?.teams||[]) {
            const side=team?.homeAway==='home'||String(team?.team?.id)===String(h.team.id)?'home':team?.homeAway==='away'||String(team?.team?.id)===String(a.team.id)?'away':'';if(!side)continue;
            for(const stat of team.statistics||[]){const row=rows.find(r=>r.key===stat?.name);if(row)row[side]=display(stat.displayValue??stat.value);}
        }
        return rows.filter(r=>r.home!==null||r.away!==null).map(({key,...r})=>r);
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
    /* ---- Football: goals, timeline, lineups and player records from source fields only. ---- */
    const SOCCER_STATS=[['possessionPct','점유율 (%)'],['totalShots','슈팅'],['shotsOnTarget','유효 슈팅'],['blockedShots','차단된 슈팅'],['wonCorners','코너킥'],['offsides','오프사이드'],['foulsCommitted','파울'],['yellowCards','경고'],['redCards','퇴장'],['saves','선방'],['totalPasses','패스 시도'],['accuratePasses','패스 성공'],['totalCrosses','크로스 시도'],['accurateCrosses','크로스 성공'],['totalLongBalls','롱볼 시도'],['accurateLongBalls','롱볼 성공'],['totalTackles','태클 시도'],['effectiveTackles','태클 성공'],['interceptions','인터셉트'],['totalClearance','클리어런스']];
    const SOCCER_PLAYER_STATS=[['totalGoals','득점'],['goalAssists','도움'],['totalShots','슈팅'],['shotsOnTarget','유효슈팅'],['foulsCommitted','파울'],['foulsSuffered','피파울'],['offsides','오프사이드'],['yellowCards','경고'],['redCards','퇴장'],['saves','선방'],['goalsConceded','실점']];
    const name=v=>typeof v==='string'&&v.trim()?v.trim().slice(0,100):null;
    function soccerKind(type,scoringPlay) {
        const t=String(type?.type||type?.text||'').toLowerCase();
        if(/own/.test(t))return 'own-goal';
        if(/penalty.*(miss|saved)/.test(t))return 'penalty-miss';
        if(/goal|penalty.*scored/.test(t)||scoringPlay===true)return 'goal';
        if(/red|second.?yellow/.test(t))return 'red';
        if(/yellow/.test(t))return 'yellow';
        if(/substitution/.test(t))return 'sub';
        return '';
    }
    // Describes how a goal was scored using only words that appear in the provider's commentary.
    function goalDetail(type,text) {
        const t=String(type?.type||type?.text||'').toLowerCase(),s=String(text||'');
        const method=/penalty/.test(t)||/\bpenalty\b/i.test(s)&&/converts|scores/i.test(s)?'페널티킥':/header|headed/i.test(t+' '+s)?'헤더':/free.?kick/.test(t)||/direct free kick/i.test(s)?'직접 프리킥':/right footed/i.test(s)?'오른발 슛':/left footed/i.test(s)?'왼발 슛':null;
        const situation=/following a corner/i.test(s)?'코너킥 상황':/fast break/i.test(s)?'역습':/set piece/i.test(s)?'세트피스':null;
        const assist=name(s.match(/Assisted by ([^.]+?)(?:\s+with\s+|\s+following\s+|\.|$)/i)?.[1]);
        return {method,situation,assist};
    }
    // Clock text such as 45'+2' sorts after 45' and before 46'.
    const clockOrder=c=>{const m=String(c||'').match(/(\d+)(?:'?\s*\+\s*(\d+))?/);return m?Number(m[1])+Number(m[2]||0)/100:9999;};
    function soccerEvents(data,h,a) {
        const sideOf=team=>String(team?.id)===String(h.team.id)?'home':String(team?.id)===String(a.team.id)?'away':'';
        const out=[];
        for(const e of Array.isArray(data?.keyEvents)?data.keyEvents:[]) {
            const kind=soccerKind(e.type,e.scoringPlay);if(!kind)continue;
            const people=(e.participants||[]).map(p=>name(p.athlete?.displayName)).filter(Boolean),text=String(e.text||'');
            const ev={type:kind,clock:String(e.clock?.displayValue||'').slice(0,12),side:sideOf(e.team),player:people[0]||null,text:String(e.shortText||text).slice(0,300)};
            if(kind==='goal'||kind==='own-goal'){const d=goalDetail(e.type,text);Object.assign(ev,kind==='own-goal'?{method:'자책골',situation:null,assist:null}:{...d,assist:d.assist||(people[1]&&!/penalty/i.test(String(e.type?.type))?people[1]:null)});}
            if(kind==='sub'){const m=text.match(/\.\s*([^.]+?)\s+replaces\s+([^.]+?)(?:\s+because of an injury)?\.?\s*$/i);ev.player=name(m?.[1])||people[0]||null;ev.playerOut=name(m?.[2])||people[1]||null;ev.injury=/because of an injury/i.test(text);}
            out.push(ev);
        }
        // keyEvents can be partial; the header's competition details also carry goals and cards.
        for(const e of data?.header?.competitions?.[0]?.details||[]) {
            const kind=e.ownGoal?'own-goal':e.scoringPlay?'goal':e.redCard?'red':e.yellowCard?'yellow':'';if(!kind)continue;
            const people=(e.participants||[]).map(p=>name(p.athlete?.displayName)).filter(Boolean),clock=String(e.clock?.displayValue||'').slice(0,12);
            const goalish=k=>k==='goal'||k==='own-goal',same=x=>x.clock===clock&&(goalish(kind)?goalish(x.type):x.type===kind)&&(!people[0]||!x.player||x.player===people[0]);
            const known=out.find(same);
            if(known){if(goalish(kind)&&!known.assist&&!e.penaltyKick&&!e.ownGoal&&people[1])known.assist=people[1];if(e.penaltyKick&&known.type==='goal')known.method='페널티킥';continue;}
            out.push({type:kind,clock,side:sideOf(e.team),player:people[0]||null,text:people.join(' · '),...(kind==='goal'?{method:e.penaltyKick?'페널티킥':null,situation:null,assist:e.penaltyKick?null:people[1]||null}:kind==='own-goal'?{method:'자책골',situation:null,assist:null}:{})});
        }
        return out.map((e,i)=>[e,i]).sort((x,y)=>clockOrder(x[0].clock)-clockOrder(y[0].clock)||x[1]-y[1]).map(([e])=>e).slice(0,120);
    }
    // Goals are credited to the side whose score increased. A provider may tag an own goal with
    // either club, so the tag is checked against the provider's own score instead of assumed.
    function soccerGoals(events,match) {
        const goals=events.filter(e=>e.type==='goal'||e.type==='own-goal').map(e=>({side:e.side,clock:e.clock,player:e.player,assist:e.assist??null,method:e.method??null,situation:e.situation??null,ownGoal:e.type==='own-goal',penalty:e.method==='페널티킥'}));
        const count=(list,side)=>list.filter(g=>g.side===side).length,matches=list=>count(list,'home')===match.homeScore&&count(list,'away')===match.awayScore;
        if(!goals.length||matches(goals))return {goals,goalsVerified:goals.length>0||match.homeScore===0&&match.awayScore===0};
        const flipped=goals.map(g=>g.ownGoal&&g.side?{...g,side:g.side==='home'?'away':'home'}:g);
        return matches(flipped)?{goals:flipped,goalsVerified:true}:{goals,goalsVerified:false};
    }
    function soccerRosters(data,h,a) {
        const didSub=v=>v===true||v?.didSub===true;
        const lineups=[],players=[];
        for(const team of Array.isArray(data?.rosters)?data.rosters:[]) {
            const id=String(team.team?.id||''),side=id===String(h.team.id)?'home':id===String(a.team.id)?'away':'';if(!side||!Array.isArray(team.roster))continue;
            const people=team.roster.filter(p=>name(p?.athlete?.displayName)).slice(0,40).map(p=>{
                const stats=new Map((p.stats||[]).map(s=>[s.name,display(s.displayValue??s.value)]));
                return {name:name(p.athlete.displayName),jersey:display(p.jersey),position:display(p.position?.abbreviation),starter:p.starter===true,subbedIn:didSub(p.subbedIn),subbedOut:didSub(p.subbedOut),stats};
            });
            if(!people.some(p=>p.starter))continue;
            const strip=({stats,...p})=>p;
            lineups.push({side,formation:display(team.formation),starters:people.filter(p=>p.starter).map(strip),bench:people.filter(p=>!p.starter).map(strip)});
            const played=people.filter(p=>p.starter||p.subbedIn),cols=SOCCER_PLAYER_STATS.filter(([k])=>played.some(p=>p.stats.get(k)!==null&&p.stats.get(k)!==undefined));
            if(played.length&&cols.length)players.push({side,title:'선수 기록',columns:['포지션',...cols.map(([,l])=>l)],entries:played.map(p=>({name:p.name,values:[p.position,...cols.map(([k])=>p.stats.get(k)??null)]}))});
        }
        return {lineups,players};
    }
    function soccerInfo(data) {
        const g=data?.gameInfo||{},venue=g.venue||{},ref=(g.officials||[]).find(o=>/referee/i.test(String(o.position?.name||o.position?.displayName||'')))||(g.officials||[])[0];
        const info={venue:display(venue.fullName),city:display(venue.address?.city),attendance:number(g.attendance)||null,referee:display(ref?.displayName||ref?.fullName)};
        return Object.values(info).some(v=>v!==null)?info:null;
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
        const out={match,periods:lines,events,stats,players:match.status==='upcoming'?[]:domesticPlayers(r,match.sport),recordAvailable:!!r};
        if(match.sport==='soccer'&&match.status!=='upcoming') {
            // Naver goal text is "<선수> 골"; the scorer is that text without the event word.
            const goalEvents=events.filter(e=>e.type==='goal'||e.type==='own-goal').map(e=>({...e,player:name(e.text.replace(/\s*(자책\s*)?골\s*$/,'')),assist:null,method:e.type==='own-goal'?'자책골':null,situation:null}));
            Object.assign(out,soccerGoals(goalEvents,match));
        }
        return out;
    }
    function espn(data,league,id) {
        const header=data?.header, comp=header?.competitions?.[0];
        if(String(header?.id)!==String(id)||!comp)throw Error('ESPN game mismatch');
        const match=C.normalizeESPN({events:[{id:header.id,date:comp.date,competitions:[comp],status:comp.status,links:header.links}]},league)[0];
        if(!match)throw Error('Invalid ESPN game');
        const h=comp.competitors.find(c=>c.homeAway==='home'),a=comp.competitors.find(c=>c.homeAway==='away');
        const lines=periods(match,h.linescores?.map(l=>l.value??l.displayValue)||[],a.linescores?.map(l=>l.value??l.displayValue)||[],match.homeScore,match.awayScore);
        if(match.sport==='soccer') {
            if(match.status==='upcoming')return {match,periods:lines,events:[],stats:[],players:[],flow:[],goals:[],goalsVerified:false,lineups:[],info:soccerInfo(data),recordAvailable:false};
            const events=soccerEvents(data,h,a),stats=soccerStats(data,h,a),{lineups,players}=soccerRosters(data,h,a);
            const fallback=players.length?players:espnPlayers(data,h,a);
            return {match,periods:lines,events,stats,players:fallback,flow:[],...soccerGoals(events,match),lineups,info:soccerInfo(data),recordAvailable:events.length>0||stats.length>0||lineups.length>0};
        }
        const scoring=Array.isArray(data.scoringPlays)&&data.scoringPlays.length?data.scoringPlays:(data.plays||[]).filter(e=>e.scoringPlay===true);
        const events=match.status==='upcoming'?[]:scoring.slice(-50).map(e=>({type:match.sport==='soccer'?eventType(e.type?.text):'score',clock:String(e.clock?.displayValue||e.period?.displayValue||''),side:String(e.team?.id)===String(h.team.id)?'home':String(e.team?.id)===String(a.team.id)?'away':'',text:String(e.text||e.shortText||(e.participants||[]).map(p=>p.athlete?.displayName).filter(Boolean).join(' · ')||(e.athletesInvolved||[]).map(p=>p.displayName||p.shortName||'').filter(Boolean).join(' · ')).slice(0,300)})).filter(e=>e.type);
        const stats=match.status==='upcoming'?[]:espnStats(data,h,a),players=match.status==='upcoming'?[]:espnPlayers(data,h,a);
        const flow=match.sport==='basketball'&&match.status!=='upcoming'&&Array.isArray(data.plays)?data.plays.filter(e=>e.scoringPlay===true&&number(e.homeScore)!==null&&number(e.awayScore)!==null&&number(e.period?.number)!==null).map(e=>({period:number(e.period.number),clock:display(e.clock?.displayValue),home:number(e.homeScore),away:number(e.awayScore)})).slice(-250):[];
        return {match,periods:lines,events,stats,players,flow,recordAvailable:!!lines||events.length>0||stats.length>0||players.length>0};
    }
    return {naver,espn,periods,eventType};
});

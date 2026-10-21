(function(){
    'use strict';
    const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const today=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
    const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
    const fresh=(value,now=Date.now())=>Number.isFinite(Date.parse(value))&&now-Date.parse(value)>=-300000&&now-Date.parse(value)<=12*3600000;
    const number=value=>value!=null&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
    const pct=value=>number(value)===null?'—':(Number(value)*100).toFixed(1)+'%';
    const score=value=>number(value)===null?'—':Number(value).toFixed(1);
    const time=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'확인 중';
    const labels={upcoming:'예정',live:'진행 중',finished:'종료',cancelled:'취소',postponed:'연기',suspended:'중단',delayed:'지연'};
    const risks={MARKET_DATA_UNAVAILABLE:'배당 정보 미연결',MONEYLINE_DATA_UNAVAILABLE:'승패 배당 없음',INJURY_DATA_UNAVAILABLE:'부상 정보 미연결',ADVANCED_STATS_UNAVAILABLE:'고급 기록 미연결',LINEUP_DATA_UNAVAILABLE:'라인업 미연결',EDGE_BELOW_THRESHOLD:'추천 기준 미달'};
    function assertSnapshot(value){
        if(value?.version!==1||!validDate(value.date)||!Number.isFinite(Date.parse(value.generatedAt))||!Array.isArray(value.status?.leagues)||!Array.isArray(value.performance?.models)||!['kbl','nba'].every(l=>Array.isArray(value.predictions?.[l]?.predictions)))throw Error('INVALID_SNAPSHOT');
        return value;
    }
    function emptyMessage(league,date){
        if(!league?.active_model)return ['분석 준비 중','경기 기록을 모으고 있습니다. 충분한 학습과 성능 검증을 마친 뒤 경기 전 분석을 제공합니다.'];
        if(date<today())return ['저장된 분석이 없습니다','선택한 날짜에 공개된 경기 전 분석이 없습니다.'];
        return ['공개된 분석이 없습니다','경기 전 분석이 생성되면 이곳에 표시됩니다.'];
    }
    if(typeof module==='object'&&module.exports){module.exports={fresh,validDate,assertSnapshot,emptyMessage};return;}
    const api=()=>['localhost','127.0.0.1'].includes(location.hostname)?location.origin:String(window.SPORTON_CONFIG?.domesticApiBase||'').replace(/\/$/,'');
    async function get(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
    async function schedule(league,date){
        try{
            const path=league==='kbl'?`/api/domestic?from=${date}&to=${date}`:`/api/overseas?league=nba&date=${date}`;
            const data=await get(api()+path),feed=league==='kbl'?data.feeds?.find(f=>f.leagueId===league):data;
            if(!feed||!['ok','stale'].includes(feed.state)||!Array.isArray(feed.matches))throw Error('FEED');
            return {...feed,saved:false};
        }catch{
            const data=await get(`/data/${league==='kbl'?'domestic':'overseas'}/${date}.json`),feed=data.feeds?.find(f=>f.leagueId===league);
            if(!feed||!['ok','stale'].includes(feed.state)||!Array.isArray(feed.matches))throw Error('FEED');
            return {...feed,saved:true};
        }
    }
    const params=new URLSearchParams(location.search);
    const Dashboard={
        date:validDate(params.get('date')||'')?params.get('date'):today(),league:params.get('league')==='nba'?'nba':'kbl',request:0,
        async load(){
            const root=document.getElementById('aiDashboard');if(!root)return;
            const id=++this.request,league=this.league,date=this.date;
            root.setAttribute('aria-busy','true');
            const results=await Promise.allSettled([get('/data/ai/snapshot.json').then(assertSnapshot),schedule(league,date)]);
            if(id!==this.request)return;
            this.render(root,results[0].status==='fulfilled'?results[0].value:null,results[1].status==='fulfilled'?results[1].value:null);
            root.setAttribute('aria-busy','false');
        },
        render(root,snapshot,feed){
            const league=snapshot?.status.leagues.find(l=>l.code===this.league),isFresh=fresh(snapshot?.generatedAt);
            const rows=snapshot?.date===this.date?snapshot.predictions[this.league].predictions:[];
            const [emptyTitle,emptyText]=emptyMessage(league,this.date);
            const cards=rows.map(item=>`<article class="ai-card"><div class="ai-card-head"><h3>${esc(item.away_team)} @ ${esc(item.home_team)}</h3><b>${!isFresh?'이전 분석':item.status==='PASS'?'판단 보류':'경기 전 분석'}</b></div><div class="ai-prob"><span>홈 승률 <b>${pct(item.home_win_probability)}</b></span><span>예상 점수 ${score(item.expected_away_score)} : ${score(item.expected_home_score)}</span></div><div class="ai-lines"><span>공정 핸디 ${score(item.fair_spread)}</span><span>예상 총점 ${score(item.fair_total)}</span></div><p>${esc((item.risk_factors||[]).map(r=>risks[r]||'추가 확인 필요').join(' · '))}</p><small>${time(item.generated_at)} KST 작성 · 결과를 보장하지 않는 참고 정보입니다.</small></article>`).join('');
            const models=(snapshot?.performance.models||[]).filter(m=>m.league===this.league&&m.sample_count>0);
            const matches=(feed?.matches||[]).filter(m=>m.leagueId===this.league&&m.rawDate===this.date);
            const feedAge=Date.now()-Date.parse(feed?.fetchedAt),feedStale=feed?.saved||feed?.state==='stale'||!Number.isFinite(feedAge)||feedAge< -5000||feedAge>120000;
            root.innerHTML=`<div class="ai-controls"><div role="group" aria-label="리그 선택">${['kbl','nba'].map(l=>`<button type="button" data-ai-league="${l}" aria-pressed="${this.league===l}">${l.toUpperCase()}</button>`).join('')}</div><label>경기 날짜 <input id="aiDate" type="date" value="${this.date}" aria-label="경기 날짜"></label><button type="button" data-ai-refresh>새로고침</button></div>
                <div class="ai-freshness ${snapshot&&!isFresh?'ai-warning':''}" role="status">${snapshot?`분석 자료 갱신: ${time(snapshot.generatedAt)} KST · 약 6시간 간격${isFresh?'':' · 갱신 지연: 이전 자료입니다'}`:'분석 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'}</div>
                <div class="ai-status-grid">${(snapshot?.status.leagues||[]).map(l=>`<article><h2>${esc(l.name)}</h2><b>${l.active_model?'검증 모델 운영 중':'분석 준비 중'}</b><span>수집된 완료 경기 ${Number(l.completed_games)||0}경기</span><span>${l.active_model?'경기 전 분석을 확인하세요.':`학습 최소 기준 ${Number(snapshot.status.policy?.minTrainGames)||40}경기 · 이후 성능 검증 필요`}</span></article>`).join('')}</div>
                <section class="ai-panel" aria-labelledby="aiMatchesTitle"><div class="ai-card-head"><h2 id="aiMatchesTitle">${this.league.toUpperCase()} 경기 일정·결과</h2><a href="/">전체 스코어 보기 →</a></div><p class="ai-caption">${feed?`${time(feed.fetchedAt)} KST 확인${feedStale?' · 저장된 자료 / 갱신 지연':' · 조회 시 갱신'}`:'경기 정보를 불러오지 못했습니다.'}</p><div class="ai-matches">${matches.map(m=>`<article class="ai-match"><span>${esc(labels[m.status]||'확인 중')} · ${time(m.isoDate)} KST</span><div><b>${esc(m.awayTeam)}</b><strong>${esc(m.awayScore??'—')} : ${esc(m.homeScore??'—')}</strong><b>${esc(m.homeTeam)}</b></div></article>`).join('')||`<p class="ai-caption">${feed?'선택한 날짜에 등록된 경기가 없습니다.':'잠시 후 다시 시도하거나 전체 스코어에서 확인해 주세요.'}</p>`}</div></section>
                <section class="ai-cards" aria-labelledby="aiPredictionsTitle"><h2 id="aiPredictionsTitle">경기 전 AI 분석 <span class="ai-beta">베타</span></h2>${cards||`<div class="ai-empty"><h3>${snapshot?emptyTitle:'분석 자료 연결 대기'}</h3><p>${snapshot?emptyText:'일정·결과는 위에서 확인할 수 있습니다.'}</p></div>`}</section>
                <section class="ai-performance"><h2>검증된 예측 성능</h2>${models.map(m=>`<p>평가 ${Number(m.sample_count)}경기 · 승패 적중률 ${pct(m.accuracy)} · 팀 점수 평균 오차 ${score(m.score_mae)}점</p>`).join('')||'<p>공개된 예측의 실제 경기 결과가 쌓이면 성능을 표시합니다.</p>'}</section>
                <details class="ai-panel"><summary>분석은 어떻게 제공되나요?</summary><p>경기 시작 전 수집된 기록으로 분석하며, 완료 경기 최소 기준을 충족한 뒤 시간순 성능 검증을 거칩니다. 최소 경기 수에 도달해도 공개 시점은 성능 검증 결과에 따라 달라집니다.</p><p>배당·부상·라인업 정보가 부족하면 판단을 보류합니다. AI 분석은 결과를 보장하지 않으며, 현재 베타 서비스입니다.</p><p>일정·결과 출처: KBL 네이버 스포츠, NBA ESPN. 날짜와 시간은 한국 시간(KST) 기준입니다.</p><a href="https://github.com/ppkuk0416/sporton/issues/new?template=bug_report.yml" target="_blank" rel="noopener">오류 제보</a> · <a href="/privacy.html">개인정보처리방침</a></details>`;
            root.querySelectorAll('[data-ai-league]').forEach(b=>b.onclick=()=>{this.league=b.dataset.aiLeague;this.sync();this.load();});
            root.querySelector('#aiDate').onchange=e=>{if(validDate(e.target.value)){this.date=e.target.value;this.sync();this.load();}};
            root.querySelector('[data-ai-refresh]').onclick=()=>this.load();
        },
        sync(){const url=new URL(location.href);url.searchParams.set('league',this.league);url.searchParams.set('date',this.date);history.replaceState(null,'',url);},
        async open(){await this.load();}
    };
    window.SportonAI=Dashboard;
    document.addEventListener('DOMContentLoaded',()=>{if(document.body.dataset.aiStandalone==='true'){Dashboard.load();document.addEventListener('visibilitychange',()=>{if(!document.hidden)Dashboard.load();});setInterval(()=>{if(!document.hidden)Dashboard.load();},300000);}});
})();

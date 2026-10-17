(function(){
    'use strict';
    const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const api=()=>['localhost','127.0.0.1'].includes(location.hostname)?location.origin:String(window.SPORTON_CONFIG?.domesticApiBase||'').replace(/\/$/,'');
    const pct=value=>value==null?'—':(Number(value)*100).toFixed(1)+'%';
    const score=value=>value==null?'—':Number(value).toFixed(1);
    async function get(path){const response=await fetch(api()+path,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('HTTP '+response.status);return response.json();}
    async function staticSnapshot(){const response=await fetch('/data/ai/snapshot.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('SNAPSHOT '+response.status);const value=await response.json();if(value.version!==1)throw new Error('SNAPSHOT_VERSION');return value;}
    const Dashboard={
        date:new Date(Date.now()+9*3600000).toISOString().slice(0,10),league:'kbl',
        async open(){await this.load();},
        async load(){
            const root=document.getElementById('aiDashboard');if(!root)return;
            root.setAttribute('aria-busy','true');root.innerHTML='<div class="ai-empty">AI 데이터 상태를 확인하고 있습니다…</div>';
            try{
                let status,predictions,performance,delivery='실시간 API';
                try{[status,predictions,performance]=await Promise.all([get('/api/ai/status'),get(`/api/ai/predictions?league=${this.league}&date=${this.date}`),get('/api/ai/performance')]);}
                catch{const saved=await staticSnapshot();status=saved.status;performance=saved.performance;predictions=saved.date===this.date&&saved.predictions?.[this.league]?saved.predictions[this.league]:{state:'DATA_UNAVAILABLE',league:this.league,date:this.date,predictions:[]};delivery='최근 검증 스냅샷';}
                this.render(root,status,predictions,performance,delivery);
            }catch{root.innerHTML='<div class="ai-empty"><strong>AI 분석 데이터 미수집</strong><span>API와 검증 스냅샷을 모두 불러오지 못했습니다. 임의 수치는 표시하지 않습니다.</span><button type="button" data-ai-retry>다시 시도</button></div>';root.querySelector('[data-ai-retry]').onclick=()=>this.load();}
            finally{root.setAttribute('aria-busy','false');}
        },
        render(root,status,predictions,performance,delivery){
            const leagues=status.leagues||[],cards=(predictions.predictions||[]).map(item=>`<article class="ai-card">
                <div class="ai-card-head"><span>${esc(item.away_team)} @ ${esc(item.home_team)}</span><b class="ai-${item.status.toLowerCase()}">${esc(item.status)}</b></div>
                <div class="ai-prob"><span>홈 승률 <b>${pct(item.home_win_probability)}</b></span><span>예상 ${score(item.expected_away_score)} : ${score(item.expected_home_score)}</span></div>
                <div class="ai-lines"><span>공정 핸디 ${score(item.fair_spread)}</span><span>공정 U/O ${score(item.fair_total)}</span><span>신뢰도 ${esc(item.data_confidence)}</span></div>
                <p>${item.recommendation?esc(item.recommendation):'추천 없음'} · ${esc((item.risk_factors||[]).join(', ')||'위험 요인 없음')}</p>
                <small>${new Date(item.generated_at).toLocaleString('ko-KR')} · ${esc(item.model_version)}</small></article>`).join('');
            root.innerHTML=`<div class="ai-controls"><div><button data-ai-league="kbl" class="${this.league==='kbl'?'active':''}">KBL</button><button data-ai-league="nba" class="${this.league==='nba'?'active':''}">NBA</button></div><input id="aiDate" type="date" value="${this.date}"></div>
                <div class="ai-status-grid">${leagues.map(item=>`<div><b>${esc(item.name)}</b><span>완료 경기 ${item.completed_games}</span><span>${item.active_model?'운영 모델 '+esc(item.active_model):'학습 대기'}</span></div>`).join('')}</div>
                <div class="ai-note">${esc(delivery)} · 실제 수집 데이터만 표시합니다. 배당·부상 정보가 없거나 Edge가 기준 미만이면 PASS합니다.</div>
                <div class="ai-cards">${cards||'<div class="ai-empty"><strong>DATA_UNAVAILABLE</strong><span>이 날짜의 공식 예측이 없습니다.</span></div>'}</div>
                <div class="ai-performance"><h3>모델 성능</h3>${(performance.models||[]).map(model=>`<p>${esc(model.league.toUpperCase())} · ${esc(model.model_version)} · 표본 ${model.sample_count} · Accuracy ${pct(model.accuracy)} · Score MAE ${score(model.score_mae)}</p>`).join('')||'<p>채점 표본 없음</p>'}</div>`;
            root.querySelectorAll('[data-ai-league]').forEach(button=>button.onclick=()=>{this.league=button.dataset.aiLeague;this.load();});
            root.querySelector('#aiDate').onchange=event=>{this.date=event.target.value;this.load();};
        }
    };
    window.SportonAI=Dashboard;
    document.addEventListener('DOMContentLoaded',()=>{if(document.body.dataset.aiStandalone==='true')Dashboard.load();});
})();

(function(){
    'use strict';
    const presets={nba:{total:48,unit:'분'},basketball:{total:40,unit:'분'},soccer:{total:90,unit:'분'},hockey:{total:60,unit:'분'},football:{total:60,unit:'분'},baseball:{total:9,unit:'이닝'},custom:{total:'',unit:'구간'}};
    const get=id=>document.getElementById(id);
    const UI={
        unit:'분',
        preset(){const p=presets[get('ouSport').value]||presets.custom;this.unit=p.unit;get('ouTotal').value=p.total;get('ouProgress').value='';get('ouProgress').placeholder=p.unit==='분'?'예: 24.5':p.unit==='이닝'?'예: 3':'예: 1';document.querySelectorAll('[data-ou-unit]').forEach(n=>n.textContent=p.unit);this.calculate(false);},
        calculate(showError=true){
            get('ouError').textContent='';
            try{const d=SportonOverUnderCore.calculate({home:get('ouHome').value,away:get('ouAway').value,line:get('ouLine').value,total:get('ouTotal').value,progress:get('ouProgress').value,timeMode:get('ouTimeMode').value});
                const fmt=n=>Number(n.toFixed(2)).toLocaleString('ko-KR');
                get('ouResult').hidden=false;get('ouCurrent').textContent=fmt(d.current);get('ouProjected').textContent=fmt(d.projected);get('ouDifference').textContent=(d.difference>0?'+':'')+fmt(d.difference);
                get('ouComparison').textContent=d.comparison==='equal'?'기준점과 같음':d.comparison==='over'?'기준점 위 (오버)':'기준점 아래 (언더)';get('ouComparison').dataset.result=d.comparison;
                get('ouPace').textContent=fmt(d.rate)+'점 / '+this.unit;get('ouRemaining').textContent=fmt(d.remaining)+' '+this.unit;get('ouNeeded').textContent=d.complete?'종료':d.pointsToOver+'점';get('ouResultCaption').textContent=d.complete?'입력한 종료 점수 기준':'현재 득점 속도가 유지될 때의 예상 합계';
            }catch(e){get('ouResult').hidden=true;if(showError)get('ouError').textContent=e.message;}
        },
        useMatch(match){
            app.switchView('overunder');get('ouSport').value=match.leagueId==='nba'?'nba':['kbl','wkbl'].includes(match.leagueId)?'basketball':presets[match.sport]?match.sport:'custom';this.preset();
            get('ouHome').value=match.homeScore??'';get('ouAway').value=match.awayScore??'';get('ouLine').value='';get('ouTimeMode').value='elapsed';
            const clock=String(match.clock||'').match(/^(\d{1,2}):(\d{2})$/),p=Number(match.period);
            const sport=get('ouSport').value,quarter=sport==='nba'?12:sport==='basketball'?10:sport==='hockey'?20:sport==='football'?15:0,periods=sport==='hockey'?3:4;
            if(clock&&quarter&&p>=1&&p<=periods&&Number(clock[1])<=quarter&&Number(clock[2])<60){get('ouProgress').value=Number(((p-1)*quarter+quarter-Number(clock[1])-Number(clock[2])/60).toFixed(3));}
            if(match.status==='finished'&&get('ouTotal').value)get('ouProgress').value=get('ouTotal').value;
            get('ouMatchName').textContent=match.awayTeam+' vs '+match.homeTeam;this.calculate(false);get('ouLine').focus();
        },
        init(){get('ouSport').addEventListener('change',()=>{get('ouMatchName').textContent='';this.preset();});get('ouForm').addEventListener('submit',e=>{e.preventDefault();this.calculate(true);});for(const id of ['ouHome','ouAway','ouLine','ouTotal','ouProgress','ouTimeMode'])get(id).addEventListener('input',()=>this.calculate(false));this.preset();}
    };
    window.SportonOverUnder=UI;document.addEventListener('DOMContentLoaded',()=>UI.init());
})();

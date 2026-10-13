(function(root){
    'use strict';
    const key=m=>JSON.stringify([m.leagueId,String(m.id),m.rawDate]);
    const numeric=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
    // Freshness is supplied by the shared feedState policy. Missing/stale entries
    // disappear from the baseline so recovery never emits catch-up events.
    function observe(previous,entries,enabled=true){
        const next=new Map(),events=[];
        if(!enabled)return {next,events};
        for(const {match:m,fresh,observedAt=Date.now()} of entries){
            if(!fresh)continue;
            const id=key(m),value={homeScore:m.homeScore,awayScore:m.awayScore,status:m.status,observedAt};
            next.set(id,value);const before=previous.get(id);if(!before||observedAt-before.observedAt>20000)continue;
            const comparable=[before.homeScore,before.awayScore,value.homeScore,value.awayScore].every(numeric);
            const score=comparable&&(before.homeScore!==value.homeScore||before.awayScore!==value.awayScore);
            const start=before.status==='upcoming'&&value.status==='live';
            const end=before.status==='live'&&value.status==='finished';
            if(score||start||end)events.push({match:m,kind:end?'end':start?'start':'score',correction:comparable&&(value.homeScore<before.homeScore||value.awayScore<before.awayScore)});
        }
        return {next,events};
    }
    if(typeof module==='object'&&module.exports){module.exports={observe,key};return;}
    const center=root.SportonCenter,C=root.SportonCore;if(!center||!C)return;
    let enabled=false,desktop=false,baseline=new Map(),panel,toggle,permission,toast,timer;
    function make(tag,cls,text){const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;}
    function message(event){const m=event.match;const label=event.kind==='end'?'경기 종료':event.kind==='start'?'경기 시작':event.correction?'점수 정정':'점수 변경';return label+' · '+m.awayTeam+' '+(numeric(m.awayScore)?m.awayScore:'—')+' : '+(numeric(m.homeScore)?m.homeScore:'—')+' '+m.homeTeam;}
    function mount(){
        const board=document.querySelector('.watchboard');if(!board)return;
        if(panel?.isConnected)return;
        panel=make('div','score-alert-controls');
        toggle=make('button','score-alert-toggle','경기 알림 켜기');toggle.type='button';toggle.setAttribute('aria-pressed','false');
        const note=make('span','score-alert-scope','고정 경기 · 페이지를 닫으면 중지 · 백그라운드에서는 지연될 수 있음');
        permission=make('button','score-alert-permission','브라우저 알림 허용');permission.type='button';permission.hidden=true;
        const feedback=make('span','score-alert-feedback');feedback.setAttribute('role','status');
        toggle.onclick=()=>{enabled=!enabled;baseline=new Map();toggle.textContent=enabled?'경기 알림 끄기':'경기 알림 켜기';toggle.setAttribute('aria-pressed',String(enabled));permission.hidden=!enabled||!('Notification'in root);desktop=false;if(!enabled&&toast){toast.hidden=true;clearTimeout(timer);}feedback.textContent=enabled?'현재 점수부터 변경을 확인합니다.':'알림을 껐습니다.';observeFeeds();};
        permission.onclick=async()=>{
            if(!enabled||!('Notification'in root))return;
            try{const result=await root.Notification.requestPermission();desktop=enabled&&result==='granted';feedback.textContent=desktop?'브라우저 알림을 허용했습니다.':result==='denied'?'브라우저 알림이 차단되어 화면에서만 알려드립니다.':'화면에서만 알려드립니다.';permission.hidden=desktop;}
            catch{feedback.textContent='브라우저 알림을 사용할 수 없어 화면에서만 알려드립니다.';}
        };
        panel.append(toggle,note,permission,feedback);board.append(panel);
        if(!toast){toast=make('div','score-alert-toast');toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.hidden=true;document.body.append(toast);}
    }
    function notify(events){
        if(!events.length||!toast)return;
        const messages=events.map(message);toast.textContent=messages.slice(0,4).join(' / ');toast.hidden=false;
        clearTimeout(timer);timer=setTimeout(()=>{toast.hidden=true;},8000);
        if(desktop&&root.Notification?.permission==='granted')for(const event of events){try{new root.Notification('SPORTON 경기 알림',{body:message(event),tag:'sporton-'+key(event.match)});}catch{}}
    }
    function observeFeeds(){
        mount();const pins=root.SportonWatchboard?.getPins?.()||[];const selected=new Set(pins.map(key));if(!selected.size&&enabled){enabled=false;desktop=false;baseline=new Map();toggle.textContent='경기 알림 켜기';toggle.setAttribute('aria-pressed','false');permission.hidden=true;feedback.textContent='고정 경기를 선택하면 알림을 켤 수 있습니다.';}
        const entries=center.lastDate===center.date?center.feeds.flatMap(feed=>feed.matches.filter(m=>selected.has(key(m))).map(match=>({match,fresh:navigator.onLine&&feed.mode==='poll'&&C.feedState(feed)==='ok'}))):[];
        const result=observe(baseline,entries,enabled);baseline=result.next;notify(result.events);
    }
    const original=center.render;
    center.render=function(...args){const result=original.apply(this,args);observeFeeds();return result;};
    // Freshness can expire without a successful request or a visible list render.
    setInterval(()=>{if(!enabled)return;if((document.hidden||app.currentView!=='home')&&!center.busy&&Date.now()-(center.lastRequestAt||0)>=5000)center.load();observeFeeds();},1000);
    window.addEventListener('offline',()=>{baseline=new Map();});
    window.addEventListener('pagehide',()=>{enabled=false;baseline=new Map();});
    document.addEventListener('DOMContentLoaded',mount);
    root.SportonScoreAlerts={observe};
})(typeof window==='undefined'?globalThis:window);

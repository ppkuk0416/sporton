(function (root) {
    'use strict';
    const KEY = 'sporton_watchboard_v1', LIMIT = 4;
    const identity = m => JSON.stringify([m.leagueId, String(m.id), m.rawDate]);
    function restore(value) {
        try {
            const entries = JSON.parse(value);
            if (!Array.isArray(entries)) return [];
            const seen = new Set();
            return entries.filter(p => p && typeof p.leagueId === 'string' && typeof p.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.rawDate) && !seen.has(identity(p)) && seen.add(identity(p)))
                .slice(0, LIMIT).map(p => ({leagueId:p.leagueId,id:p.id,rawDate:p.rawDate}));
        } catch { return []; }
    }
    function toggle(pins, match) {
        const key = identity(match);
        if (pins.some(p => identity(p) === key)) return pins.filter(p => identity(p) !== key);
        if (pins.length >= LIMIT) return pins;
        return [...pins, {leagueId:match.leagueId,id:String(match.id),rawDate:match.rawDate}];
    }
    const core = {identity, restore, toggle, LIMIT};
    if (typeof module === 'object' && module.exports) { module.exports = core; return; }
    const center = root.SportonCenter, C = root.SportonCore;
    // The existing score renderer is authoritative; this feature makes no requests.
    if (!center) return;
    let pins = [];
    try { pins = restore(localStorage.getItem(KEY)); } catch {}
    let board, grid, status, signature = '';
    function element(tag, className, text) {
        const node = document.createElement(tag); if(className)node.className=className;
        if(text!==undefined)node.textContent=text;return node;
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(pins)); return true; } catch { return false; } }
    function select(match) {
        const next=toggle(pins,match);
        if(next===pins){status.textContent='최대 4경기까지 고정할 수 있습니다. 먼저 한 경기를 해제해 주세요.';return;}
        pins=next;const persisted=save();signature='';center.render();
        status.textContent=persisted?'':'저장 공간을 사용할 수 없어 이 화면에서만 유지됩니다.';
    }
    function mount(container) {
        if(board?.isConnected)return;
        board=element('section','watchboard');board.setAttribute('aria-label','내 경기판');
        const heading=element('div','watchboard-heading');
        heading.append(element('strong','','내 경기판'),element('span','','최대 4경기 · 목록 필터와 별개'));
        status=element('p','watchboard-status');status.setAttribute('role','status');
        grid=element('div','watchboard-grid');board.append(heading,status,grid);container.before(board);
    }
    function render() {
        const container=document.getElementById('homeGamesContainer');if(!container)return;mount(container);board.hidden=!pins.length;
        // Use feedState through the same public core as the main list.
        const feeds=center.lastDate===center.date?center.feeds:[];
        const matches=new Map(feeds.flatMap(f=>f.matches.map(m=>[identity(m),{match:m,feed:f}])));
        const current=pins.map(p=>({pin:p,item:matches.get(identity(p))}));
        const freshness=root.SportonCore || C;
        const nextSignature=JSON.stringify(current.map(({pin,item})=>[pin,item?.match,item?.feed?.mode,item?freshness?.feedState(item.feed):'missing',navigator.onLine]));
        if(nextSignature!==signature){
            signature=nextSignature;grid.replaceChildren();
            if(!pins.length)grid.append(element('p','watchboard-empty','목록의 ‘고정’ 버튼으로 함께 볼 경기를 선택하세요.'));
            for(const {pin,item} of current){
                const card=element('article','watchboard-card');
                const remove=element('button','watchboard-remove','해제');remove.type='button';remove.setAttribute('aria-label',pin.leagueId+' '+pin.rawDate+' 경기 고정 해제');remove.onclick=()=>select(pin);
                const meta=element('div','watchboard-meta',pin.leagueId.toUpperCase()+' · '+pin.rawDate);card.append(meta,remove);
                if(!item){card.append(element('p','watchboard-unavailable',pin.rawDate===center.date?'경기 정보를 확인 중입니다.':'이 날짜를 선택하면 경기 점수를 확인할 수 있습니다.'));}
                else{
                    const {match:m,feed}=item;
                    const detail=element('button','watchboard-detail');detail.type='button';detail.setAttribute('aria-label',m.awayTeam+' 대 '+m.homeTeam+' 경기 상세');detail.onclick=()=>app.showGameDetail(m);
                    for(const side of ['away','home']){const team=element('span','watchboard-team');team.append(element('span','',m[side+'Team']),element('b','',m[side+'Score']==null?'—':String(m[side+'Score'])));detail.append(team);}
                    const state=freshness?.feedState(feed) || feed.state;
                    const fresh=state==='ok'&&feed.mode==='poll'&&navigator.onLine;
                    card.classList.toggle('watchboard-stale',!fresh);
                    const label=fresh?(m.status==='live'?m.time:(freshness?.LABELS[m.status]||m.status)):'마지막 확인 점수 · 갱신 지연';
                    detail.append(element('span','watchboard-state',label));card.append(detail);
                    card.append(element('span','watchboard-time'));
                }
                grid.append(card);
            }
        }
        current.forEach(({item},index)=>{
            const stamp=grid.children[index]?.querySelector('.watchboard-time');
            if(stamp&&item?.feed.fetchedAt){const t=new Date(item.feed.fetchedAt);stamp.textContent='확인 '+t.toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
        });
        for(const row of container.querySelectorAll('.score-row')){
            const match=row._match;if(!match)continue;
            let button=row.querySelector('.watchboard-pin');
            if(!button){button=element('button','watchboard-pin');button.type='button';button.onclick=()=>select(row._match);row.append(button);}
            const selected=pins.some(p=>identity(p)===identity(match));button.textContent=selected?'고정됨':'고정';button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',match.awayTeam+' 대 '+match.homeTeam+(selected?' 경기 고정 해제':' 경기판에 고정'));
        }
    }
    const original=center.render;
    center.render=function(...args){const result=original.apply(this,args);render();return result;};
    root.SportonWatchboard={render,getPins:()=>pins.map(p=>({...p}))};
    window.addEventListener('storage',event=>{if(event.key!==KEY)return;pins=restore(event.newValue);signature='';center.render();});
    document.addEventListener('DOMContentLoaded',render);
})(typeof window === 'undefined' ? globalThis : window);

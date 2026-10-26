/* Current-season football tables; provider order and groups are preserved. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.SportonStandings=api;api.mount();}})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const number=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
const safeUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:'';}catch{return '';}};
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function espn(data){
 const groups=[];function visit(node){const entries=node?.standings?.entries;if(Array.isArray(entries)&&entries.length){groups.push({name:node.name||data.name||'',season:String(node.standings.seasonDisplayName||node.standings.season||node.abbreviation||''),entries:entries.filter(e=>e.team?.displayName||e.team?.name).map((e,i)=>{const s=Object.fromEntries((e.stats||[]).map(x=>[x.name,x.value]));return{rank:number(s.rank)??i+1,name:e.team.displayName||e.team.name,logo:safeUrl(e.team.logos?.[0]?.href),played:number(s.gamesPlayed),won:number(s.wins),drawn:number(s.ties),lost:number(s.losses),gf:number(s.pointsFor),ga:number(s.pointsAgainst),gd:number(s.pointDifferential),pts:number(s.points),form:typeof s.form==='string'?s.form.replace(/[^WDL]/g,'').slice(-5):''};})});return;}for(const child of node?.children||[])visit(child);}visit(data);if(!groups.length||groups.some(g=>!g.entries.length))throw Error('No standings');return groups;
}
function naver(data,season){
 if(data?.success!==true||!Array.isArray(data?.result?.seasonTeamStats)||!data.result.seasonTeamStats.length)throw Error('No standings');
 const groups=new Map();for(const e of data.result.seasonTeamStats){if(!e.teamName)continue;const name=e.group||'전체 순위';if(!groups.has(name))groups.set(name,{name,season:String(season),entries:[]});groups.get(name).entries.push({rank:number(e.rank),name:e.teamName,logo:safeUrl(e.teamEmblemUrl),played:number(e.matchesPlayed),won:number(e.wins),drawn:number(e.draws),lost:number(e.losses),gf:number(e.goals),ga:number(e.goalsConceded),gd:number(e.goalsDifference),pts:number(e.points),form:typeof e.lastFiveGames==='string'?e.lastFiveGames.replace(/[^WDL]/g,'').slice(-5):''});}
 if(!groups.size)throw Error('No teams');return [...groups.values()];
}
function seasonCode(data,year){
 const choices=data?.result?.seasons?.filter(s=>s.isEnable==='Y'&&Number(s.year)<=year&&/^\d{4}$/.test(String(s.seasonCode)))||[];
 const selected=choices.find(s=>s.isSeason==='Y')||choices.sort((a,b)=>Number(b.year)-Number(a.year))[0];if(!selected)throw Error('No season');return String(selected.seasonCode);
}
function validate(data,id){return data?.version===1&&data.leagueId===id&&Number.isFinite(Date.parse(data.fetchedAt))&&Array.isArray(data.groups)&&data.groups.length>0&&data.groups.every(g=>Array.isArray(g.entries)&&g.entries.length>0);}
function table(groups,translate=x=>x){
 const value=x=>number(x)===null?'—':escape(x);return groups.map(g=>'<section class="football-table-group"><h3>'+escape(g.name)+'</h3><div class="football-table-scroll" tabindex="0" role="region" aria-label="'+escape(g.name)+' 순위표 가로 스크롤"><table class="football-table"><caption>'+escape(g.season)+' 현재 시즌 순위</caption><thead><tr>'+['순위','팀','경기','승','무','패','득점','실점','득실','승점','최근 5경기'].map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+g.entries.map(e=>'<tr><td>'+value(e.rank)+'</td><th scope="row">'+(safeUrl(e.logo)?'<img src="'+escape(safeUrl(e.logo))+'" alt="" loading="lazy" width="22" height="22">':'')+'<span>'+escape(translate(e.name))+'</span></th>'+[e.played,e.won,e.drawn,e.lost,e.gf,e.ga,e.gd,e.pts].map(x=>'<td>'+value(x)+'</td>').join('')+'<td><span class="football-form">'+(e.form||'').split('').filter(x=>/[WDL]/.test(x)).map(x=>'<span class="football-form-'+x+'" title="'+({W:'승',D:'무',L:'패'}[x])+'">'+({W:'승',D:'무',L:'패'}[x])+'</span>').join('')+'</span></td></tr>').join('')+'</tbody></table></div></section>').join('');
}
function mount(){
 const boot=()=>{
 const C=window.SportonCore,center=window.SportonCenter;if(!C||!center)return;
 const leagues=C.LEAGUES.filter(l=>l.sport==='soccer'),memo=new Map(),pending=new Map();
 let selected='',pane='matches',sequence=0,lastAttempt=0,container,lastLeagueFilter='',wasVisible=false;
 const visible=()=>app.currentSport==='soccer'&&app.currentView==='home';
 const allowed=()=>leagues.filter(l=>!center.region||center.region==='all'||l.region===center.region);
 const stamp=iso=>new Date(iso).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hourCycle:'h23'});
 async function load(id,force=false){
  const old=memo.get(id);if(!force&&old&&Date.now()-old.at<60000)return old.data;if(pending.has(id))return pending.get(id);
  const task=(async()=>{
   let data,mode='direct';const league=leagues.find(l=>l.id===id);
   try{
    if(league.region==='kr'){mode='published';const r=await fetch('/data/standings/'+encodeURIComponent(id)+'.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);data=await r.json();}
    else{const r=await fetch('https://site.web.api.espn.com/apis/v2/sports/soccer/'+encodeURIComponent(id)+'/standings',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);const raw=await r.json();data={version:1,leagueId:id,source:'ESPN',fetchedAt:new Date().toISOString(),groups:espn(raw)};}
    if(!validate(data,id))throw Error('Invalid standings');
    const result={...data,mode};memo.set(id,{at:Date.now(),data:result});return result;
   }catch(error){
    if(league.region!=='kr'){try{const r=await fetch('/data/standings/'+encodeURIComponent(id)+'.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw error;const data=await r.json();if(!validate(data,id))throw error;const result={...data,mode:'published',refreshFailed:true};memo.set(id,{at:Date.now(),data:result});return result;}catch{}}
    if(old)return {...old.data,refreshFailed:true};throw error;
   }
  })().finally(()=>pending.delete(id));pending.set(id,task);return task;
 }
 function showData(data){
  if(!validate(data,selected))throw Error('Invalid standings');const age=Date.now()-Date.parse(data.fetchedAt),stale=data.state==='stale'||data.refreshFailed||age < -30000||age>(data.mode==='published'?15*60000:2*60000);
  document.getElementById('footballStandingsStatus').textContent=(stale?'갱신 지연 · 이전 순위 표시 · ':'')+data.source+' · 조회 '+stamp(data.fetchedAt)+' KST'+(data.mode==='published'?' · 약 5분 주기 갱신 (배포 상황에 따라 지연)':' · 1분마다 조회');
  const content=document.getElementById('footballStandingsContent');content.innerHTML=table(data.groups,name=>typeof KoreanNames!=='undefined'?KoreanNames.translateTeam(name):name);
  document.getElementById('footballStandingsSeason').textContent=data.groups.map(g=>g.season).filter((x,i,a)=>x&&a.indexOf(x)===i).join(' / ')+' · 현재 시즌';
 }
 async function refresh(force=false){
  if(!visible()||pane!=='standings'||!selected)return;const id=selected,token=++sequence;lastAttempt=Date.now();
  const content=document.getElementById('footballStandingsContent'),button=document.getElementById('footballStandingsRefresh');button.disabled=true;content.setAttribute('aria-busy','true');
  const old=memo.get(id);if(old)showData(old.data);else{content.textContent='순위를 불러오는 중…';document.getElementById('footballStandingsStatus').textContent='';}
  try{const data=await load(id,force);if(token===sequence&&selected===id&&visible())showData(data);}
  catch{if(token===sequence&&selected===id){content.textContent='순위를 불러오지 못했습니다. 새로고침으로 다시 시도해주세요.';document.getElementById('footballStandingsStatus').textContent='연결 실패';}}
  finally{if(token===sequence){button.disabled=false;content.setAttribute('aria-busy','false');}}
 }
 function update(){
  if(!container)return;const active=visible(),becameVisible=active&&!wasVisible;wasVisible=active;container.hidden=!active;if(app.currentSport==='soccer'&&app.currentView==='home')document.getElementById('standingsContainer').style.display='none';document.body.classList.toggle('football-standings-open',active&&pane==='standings');
  if(!active){sequence++;return;}
  const options=allowed(),preferred=center.leagueId!==lastLeagueFilter?options.find(l=>l.id===center.leagueId):null;lastLeagueFilter=center.leagueId;const next=preferred?.id||(options.some(l=>l.id===selected)?selected:options.find(l=>l.id==='eng.1')?.id||options[0]?.id);
  const changed=next!==selected;selected=next;const select=document.getElementById('footballStandingsLeague');const key=options.map(l=>l.id).join(',');if(select.dataset.key!==key){select.innerHTML=options.map(l=>'<option value="'+escape(l.id)+'">'+escape(l.name)+'</option>').join('');select.dataset.key=key;}select.value=selected;
  container.querySelectorAll('[data-football-pane]').forEach(b=>{const on=b.dataset.footballPane===pane;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;b.classList.toggle('active',on);});document.getElementById('footballStandingsPanel').hidden=pane!=='standings';
  if(pane==='standings'&&(changed||!memo.has(selected)||becameVisible))refresh();
 }
 container=document.createElement('section');container.className='football-standings';container.id='footballStandings';container.hidden=true;
 container.innerHTML='<div class="football-view-tabs" role="tablist" aria-label="축구 보기"><button type="button" id="footballMatchesTab" role="tab" data-football-pane="matches" aria-controls="footballMatchesPanel">경기</button><button type="button" id="footballStandingsTab" role="tab" data-football-pane="standings" aria-controls="footballStandingsPanel">리그 순위표</button></div><div id="footballStandingsPanel" role="tabpanel" aria-labelledby="footballStandingsTab" hidden><div class="football-standings-controls"><label>리그 <select id="footballStandingsLeague" aria-label="순위표 리그"></select></label><button type="button" id="footballStandingsRefresh">새로고침</button></div><p id="footballStandingsSeason"></p><p id="footballStandingsStatus" role="status" aria-live="polite"></p><div id="footballStandingsContent"></div></div>';
 const games=document.getElementById('homeGamesContainer');games.before(container);games.setAttribute('role','tabpanel');container.querySelector('#footballMatchesTab').setAttribute('aria-controls','homeGamesContainer');
 container.addEventListener('click',e=>{const tab=e.target.closest('[data-football-pane]');if(tab){const oldPane=pane;pane=tab.dataset.footballPane;update();if(pane==='standings'&&oldPane!==pane)refresh();}if(e.target.id==='footballStandingsRefresh')refresh(true);});
 container.addEventListener('keydown',e=>{if(!e.target.matches('[data-football-pane]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...container.querySelectorAll('[data-football-pane]')];const i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(tabs.indexOf(e.target)+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[i].focus();tabs[i].click();});
 container.addEventListener('change',e=>{if(e.target.id==='footballStandingsLeague'){selected=e.target.value;document.getElementById('footballStandingsSeason').textContent='';refresh();}});
 const oldStandingsInit=StandingsService.init.bind(StandingsService);StandingsService.init=function(sport){if(sport==='soccer'&&app.currentView==='home')return;return oldStandingsInit(sport);};
 const oldRender=center.render.bind(center);center.render=function(...args){const value=oldRender(...args);update();return value;};
 const oldFilter=app.filterSport.bind(app);app.filterSport=function(...args){const value=oldFilter(...args);update();return value;};
 const oldSwitch=app.switchView.bind(app);app.switchView=function(...args){const value=oldSwitch(...args);update();if(visible()&&pane==='standings')refresh();return value;};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('online',()=>refresh(true));
 setInterval(()=>{if(!document.hidden&&visible()&&pane==='standings'&&Date.now()-lastAttempt>=60000)refresh(true);},1000);
 update();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
}
return {espn,naver,seasonCode,validate,table,mount};
});

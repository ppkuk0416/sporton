/* SPORTON score center. Runs after app.js and before DOMContentLoaded. */
(function () {
    'use strict';
    const C = window.SportonCore;
    const config = window.SPORTON_CONFIG || {};
    const memo = new Map();
    const pending = new Map();
    const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const clock = date => new Date(date).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    async function json(url) {
        const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    }
    async function domestic(date) {
        const key = 'kr:' + date;
        const old = memo.get(key);
        if (old && Date.now() - old.at < 4000) return old.feeds;
        if (pending.has(key)) return pending.get(key);
        const promise = (async () => {
            let data, mode = 'poll';
            try {
                data = await json((config.domesticApiBase || '').replace(/\/$/, '') + '/api/domestic?from=' + date + '&to=' + date);
            } catch {
                mode = 'snapshot';
                data = await json('/data/domestic/' + date + '.json');
            }
            if (data?.version !== 1 || data.from !== date || !Array.isArray(data.feeds)) throw new Error('국내 데이터 형식 오류');
            const feeds = C.LEAGUES.filter(l => l.region === 'kr').map(l => {
                const f = data.feeds.find(f => f.leagueId === l.id);
                if (!f || f.state === 'error' || !Array.isArray(f.matches) || !Number.isFinite(Date.parse(f.fetchedAt))) {
                    const previous=old?.feeds.find(f=>f.id===l.id&&f.state!=='error');
                    return previous?{...previous,state:'stale'}:{...l,state:'error',matches:[],mode};
                }
                const age = Date.now() - Date.parse(f.fetchedAt);
                const state = f.state === 'error' ? 'error' : age > (mode === 'snapshot' ? 10 * 60000 : 45000) || f.state === 'stale' ? 'stale' : 'ok';
                return { ...l, state, mode, fetchedAt: f.fetchedAt, matches: f.matches.filter(m => m.leagueId === l.id && m.rawDate === date) };
            });
            memo.set(key, { at: Date.now(), feeds });
            return feeds;
        })().catch(() => {
            const feeds = C.LEAGUES.filter(l => l.region === 'kr').map(l => {
                const previous = old?.feeds.find(f => f.id === l.id && f.state !== 'error');
                return previous ? { ...previous, state: 'stale' } : { ...l, state: 'error', matches: [] };
            });
            return feeds;
        }).finally(() => pending.delete(key));
        pending.set(key, promise);
        return promise;
    }
    async function worldSnapshot(date) {
        const key = 'snapshot-world:' + date;
        const old = memo.get(key);
        if (old && Date.now()-old.at < 4000) return old.data;
        if (pending.has(key)) return pending.get(key);
        const task = json('/data/overseas/' + date + '.json').then(data => {
            if (data.version !== 1 || data.from !== date || !Array.isArray(data.feeds)) throw new Error('ESPN 수집본 형식 오류');
            memo.set(key,{at:Date.now(),data});return data;
        }).finally(()=>pending.delete(key));
        pending.set(key,task);return task;
    }

    async function world(date, sport) {
        const leagues = C.LEAGUES.filter(l => l.region === 'world' && (sport === 'all' || l.sport === sport));
        const key = 'world:' + date + ':' + sport;
        const old = memo.get(key);
        if (old && Date.now() - old.at < 4000) return old.feeds;
        if (pending.has(key)) return pending.get(key);
        const task = (async () => {
            let data, mode = 'poll';
            try {
                data = await json((config.domesticApiBase || '').replace(/\/$/, '') + '/api/overseas?date=' + date + '&sport=' + encodeURIComponent(sport));
            } catch {
                mode = 'snapshot'; data = await worldSnapshot(date);
            }
            if (data?.version !== 1 || data.from !== date || !Array.isArray(data.feeds)) throw new Error('ESPN 데이터 형식 오류');
            const feeds = leagues.map(l => {
                const f = data.feeds.find(f => f.leagueId === l.id);
                const previous = old?.feeds.find(f => f.id === l.id && f.state !== 'error');
                if (!f || !Array.isArray(f.matches) || !Number.isFinite(Date.parse(f.fetchedAt)) || f.state === 'error')
                    return previous ? { ...previous, state: 'stale' } : { ...l, state: 'error', mode, matches: [] };
                const age = Date.now() - Date.parse(f.fetchedAt);
                const state = f.state === 'stale' || age > (mode === 'snapshot' ? 600000 : 45000) ? 'stale' : 'ok';
                const matches = f.matches.filter(m => m.rawDate === date && m.leagueId === l.id).map(m => ({ ...m, homeTeam: KoreanNames.translateTeam(m.homeTeam), awayTeam: KoreanNames.translateTeam(m.awayTeam) }));
                return { ...l, mode, state, fetchedAt: f.fetchedAt, matches };
            });
            memo.set(key, { at: Date.now(), feeds }); return feeds;
        })().catch(() => leagues.map(l => {
            const previous = old?.feeds.find(f => f.id === l.id && f.state !== 'error');
            return previous ? { ...previous, state: 'stale' } : { ...l, state: 'error', matches: [] };
        })).finally(() => pending.delete(key));
        pending.set(key, task); return task;
    }
    const Scores = {
        async load(date, region = 'all', sport = 'all', onProgress) {
            const requests = [];
            if (region !== 'world') requests.push(domestic(date).then(fs => fs.filter(l => sport === 'all' || l.sport === sport)));
            if (region !== 'kr') requests.push(world(date, sport));
            return (await Promise.all(requests.map(async request => { const feeds=await request; onProgress?.(feeds); return feeds; }))).flat();
        },
        invalidate() { for (const value of memo.values()) value.at = 0; }
    };

    // Every legacy live/upcoming view uses the same domestic + overseas league registry.
    C.LEAGUES.filter(l => l.region === 'kr').forEach(l => {
        if (!ApiService.sportConfig[l.sport]) ApiService.sportConfig[l.sport] = { name: '배구', icon: '🏐', leagues: [] };
        ApiService.sportConfig[l.sport].leagues.unshift({ ...l, icon: '🇰🇷' });
    });
    ApiService.getMatchesBySport = async function (sport, filter) {
        const today = C.kstDate();
        const dates = filter === 'upcoming' ? [0, 1, 2, 3].map(i => C.shiftDate(today, i)) : [today];
        const all = (await Promise.all(dates.map(date => Scores.load(date, 'all', sport)))).flat();
        const result = {};
        for (const feed of all) {
            const group = result[feed.sport] ||= { name: this.sportConfig[feed.sport]?.name || feed.sport, icon: this.sportConfig[feed.sport]?.icon || '🏐', leagues: [] };
            let league = group.leagues.find(l => l.id === feed.id);
            if (!league) { league = { ...feed, matches: [], source: feed.region === 'kr' ? 'naver' : 'espn' }; group.leagues.push(league); }
            if (feed.state !== 'ok') league.state = feed.state;
            const seen = new Set(league.matches.map(m => m.id));
            feed.matches.filter(m => !seen.has(m.id) && (!filter || m.status === filter)).forEach(m => league.matches.push(m));
        }
        return result;
    };

    const Center = {
        date: C.kstDate(), region: 'all', status: 'all', query: '', feeds: [], sequence: 0,
        favorites: new Set(), favoriteTeams: new Map(), busy: false, lastDate: '', leagueId: '', activeTeam: '',
        init() {
            try { this.favorites = new Set(JSON.parse(localStorage.getItem('sporton_match_favorites') || '[]')); } catch {}
            try { this.favoriteTeams = new Map(JSON.parse(localStorage.getItem('sporton_favorite_teams') || '[]').filter(x => Array.isArray(x) && typeof x[0] === 'string' && typeof x[1]?.name === 'string')); } catch {}
            const params = new URLSearchParams(location.search);
            let prefs = {}; try { prefs = JSON.parse(localStorage.getItem('sporton_score_preferences') || '{}'); } catch {}
            if (['kr','world','all'].includes(prefs.region)) this.region = prefs.region;
            const sport = params.get('sport') || prefs.sport;
            if (['all', ...C.LEAGUES.map(l => l.sport)].includes(sport)) app.currentSport = sport;
            document.querySelectorAll('.sport-tab').forEach(b => b.classList.toggle('active', b.dataset.sport === app.currentSport));
            if (C.validDate(params.get('date'))) this.date = params.get('date');
            if (['kr', 'world', 'all'].includes(params.get('region'))) this.region = params.get('region');
            this.query = params.get('q') || '';
            const toolbar = document.getElementById('scoreToolbar');
            if (!toolbar) return;
            toolbar.innerHTML = `
                <div class="score-date-row">
                    <button class="score-icon-button" id="scorePrev" aria-label="전날 경기">‹</button>
                    <label class="score-date-label"><input type="date" id="scoreDate" aria-label="경기 날짜" value="${this.date}"></label>
                    <button class="score-icon-button" id="scoreNext" aria-label="다음날 경기">›</button>
                    <button class="score-chip" id="scoreToday">오늘</button>
                    <span class="score-timezone" title="모든 경기 시간은 한국 시간">KST</span>
                </div>
                <div class="score-quick-leagues" aria-label="인기 리그"><button class="score-chip" data-league="">모든 리그</button><button class="score-chip" data-league="kbo">KBO</button><button class="score-chip" data-league="kleague">K리그</button><button class="score-chip" data-league="nba">NBA</button><button class="score-chip" data-league="mlb">MLB</button></div>
                <div id="scoreFavoriteTeams" class="score-favorite-teams" aria-label="저장한 관심 팀"></div>
                <div class="score-filter-row">
                    <div class="score-status-tabs" aria-label="경기 상태">
                        <button class="score-chip active" data-status="all">전체</button>
                        <button class="score-chip" data-status="live">🔴 진행 중</button>
                        <button class="score-chip" data-status="upcoming">예정</button>
                        <button class="score-chip" data-status="finished">종료</button>
                        <button class="score-chip" data-status="favorites">★ 관심 경기</button>
                        <button class="score-chip" data-status="myteams">♡ 내 팀</button>
                    </div>

                </div>
                <details class="score-extra-filters" ${this.query ? 'open' : ''}><summary>필터·검색</summary><div class="score-extra-content">                <div class="score-region-tabs" aria-label="경기 지역">
                    <button class="score-chip" data-region="kr">🇰🇷 국내</button>
                    <button class="score-chip" data-region="world">해외</button>
                    <button class="score-chip" data-region="all">전체</button>
                </div>
<label class="score-search"><span aria-hidden="true">⌕</span><input type="search" id="scoreSearch" placeholder="팀 또는 리그 검색" aria-label="팀 또는 리그 검색" maxlength="80"></label></div></details>`;
            document.getElementById('scoreSearch').value = this.query;
            const dateChange = date => {
                if (!C.validDate(date)) return;
                this.date = date; document.getElementById('scoreDate').value = date;
                this.saveLocation(); this.load();
            };
            document.getElementById('scoreDate').addEventListener('change', e => dateChange(e.target.value));
            document.getElementById('scorePrev').addEventListener('click', () => dateChange(C.shiftDate(this.date, -1)));
            document.getElementById('scoreNext').addEventListener('click', () => dateChange(C.shiftDate(this.date, 1)));
            document.getElementById('scoreToday').addEventListener('click', () => dateChange(C.kstDate()));
            toolbar.querySelectorAll('[data-region]').forEach(b => b.addEventListener('click', () => {
                this.region = b.dataset.region; this.leagueId = ''; this.activeTeam = ''; this.saveLocation(); this.load();
            }));
            toolbar.querySelectorAll('[data-league]').forEach(b => b.addEventListener('click', () => {
                this.leagueId = b.dataset.league; this.activeTeam = '';
                const league = C.LEAGUES.find(l => l.id === this.leagueId);
                if (league) { this.region = league.region; app.filterSport(league.sport); }
                else this.load();
                this.saveLocation();
            }));
            toolbar.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', () => {
                this.status = b.dataset.status; this.render();
            }));
            document.getElementById('scoreSearch').addEventListener('input', e => { this.query = e.target.value; this.render(); this.saveLocation(); });
            document.getElementById('scoreRetry').addEventListener('click', () => this.load(true));
            document.querySelectorAll('[data-score-nav]').forEach(b => b.addEventListener('click', () => {
                const action = b.dataset.scoreNav;
                this.date = C.kstDate(); document.getElementById('scoreDate').value = this.date;
                this.status = action === 'live' ? 'live' : action === 'myteams' ? 'myteams' : 'all';
                this.leagueId = ''; this.activeTeam = ''; this.query = ''; document.getElementById('scoreSearch').value = '';
                if (action === 'myteams' || action === 'live') { this.region = 'all'; app.currentSport = 'all'; document.querySelectorAll('.sport-tab').forEach(t => t.classList.toggle('active',t.dataset.sport==='all')); }
                if (app.currentView !== 'home') app.switchView('home');
                this.saveLocation(); this.load();
                if (action === 'date') { document.getElementById('scoreDate').focus(); document.getElementById('scoreToolbar').scrollIntoView({block:'start',behavior:'smooth'}); }
            }));
            document.addEventListener('visibilitychange', () => { if (!document.hidden && app.currentView === 'home') this.load(); });
            window.addEventListener('online', () => this.load(true));
            window.addEventListener('offline', () => this.render());
            this.render();
        },
        saveLocation() {
            const url = new URL(location.href);
            url.searchParams.set('date', this.date); url.searchParams.set('region', this.region);
            url.searchParams.set('sport', app.currentSport);
            if (this.query) url.searchParams.set('q', this.query); else url.searchParams.delete('q');
            history.replaceState(history.state, '', url);
            try { localStorage.setItem('sporton_score_preferences', JSON.stringify({region:this.region,sport:app.currentSport})); } catch {}
        },
        toggleTeam(match, side) {
            const key = C.teamKey(match, side);
            this.favoriteTeams.has(key) ? this.favoriteTeams.delete(key) : this.favoriteTeams.set(key,{name:match[side+'Team'],leagueId:match.leagueId});
            try { localStorage.setItem('sporton_favorite_teams',JSON.stringify([...this.favoriteTeams])); } catch {}
            this.render();
        },
        preview(date, region, sport, token) {
            const regions=region==='all'?['kr','world']:[region];
            for(const target of regions) {
                const request=target==='world'?worldSnapshot(date):json('/data/domestic/'+date+'.json');
                request.then(data=>{
                    if(token!==this.sequence||data?.version!==1||data.from!==date||!Array.isArray(data.feeds))return;
                    const present=this.lastDate===date?this.feeds:[],ids=new Set(present.filter(f=>f.state!=='error').map(f=>f.id));
                    const previews=C.LEAGUES.filter(l=>l.region===target&&(sport==='all'||l.sport===sport)&&!ids.has(l.id)).flatMap(l=>{
                        const f=data.feeds.find(f=>f.leagueId===l.id);
                        if(!f||f.state==='error'||!Array.isArray(f.matches)||!Number.isFinite(Date.parse(f.fetchedAt)))return [];
                        const matches=f.matches.filter(m=>m.leagueId===l.id&&m.rawDate===date).map(m=>target==='world'?{...m,homeTeam:KoreanNames.translateTeam(m.homeTeam),awayTeam:KoreanNames.translateTeam(m.awayTeam)}:m);
                        return [{...l,mode:'snapshot',state:f.state,fetchedAt:f.fetchedAt,matches}];
                    });
                    if(previews.length){const added=new Set(previews.map(f=>f.id));this.feeds=[...present.filter(f=>!added.has(f.id)),...previews];this.lastDate=date;this.render();}
                }).catch(()=>{});
            }
        },
        async load(force = false) {
            const token = ++this.sequence;
            this.lastRequestAt = Date.now();
            if (force) Scores.invalidate();
            this.busy = true; this.render();
            const date = this.date, region = this.region, sport = app.currentSport;
            const preserve=items=>items.map(f=>{const previous=this.lastDate===date?this.feeds.find(p=>p.id===f.id&&p.state!=='error'):null;return f.state==='error'&&previous?{...previous,state:'stale'}:f;});
            if(document.getElementById('scoreDate')&&(this.lastDate!==date||!this.feeds.length))this.preview(date,region,sport,token);
            const feeds = await Scores.load(date, region, sport, partial => {
                if (token !== this.sequence) return;
                const ids=new Set(partial.map(f=>f.id));
                this.feeds=[...(this.lastDate===date?this.feeds.filter(f=>!ids.has(f.id)):[]),...preserve(partial)];
                this.lastDate=date;this.render();
            });
            if (token !== this.sequence) return;
            this.feeds = preserve(feeds); this.lastDate = date; this.busy = false; this.render();
        },
        render() {
            const container = document.getElementById('homeGamesContainer');
            if (!container || !document.getElementById('scoreDate')) return;
            const feeds = this.lastDate === this.date ? this.feeds.filter(l =>
                (this.region === 'all' || l.region === this.region) &&
                (app.currentSport === 'all' || l.sport === app.currentSport)).map(f => ({...f,state:C.feedState(f)})) : [];
            document.querySelectorAll('[data-league]').forEach(b => { const active=b.dataset.league===this.leagueId;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active)); });
            document.querySelectorAll('[data-score-nav]').forEach(b => b.classList.toggle('active', app.currentView==='home' && b.dataset.scoreNav === (this.status === 'live' ? 'live' : this.status === 'myteams' ? 'myteams' : 'today')));
            const teamContainer = document.getElementById('scoreFavoriteTeams'); teamContainer.replaceChildren();
            for (const [key, team] of this.favoriteTeams) {
                const b = document.createElement('button');b.className='score-chip';b.textContent='♡ '+team.name;b.setAttribute('aria-label',team.name+' 경기 보기');
                b.classList.toggle('active',this.activeTeam===key);b.setAttribute('aria-pressed',String(this.activeTeam===key));
                b.addEventListener('click',()=>{this.query='';document.getElementById('scoreSearch').value='';this.activeTeam=key;this.status='myteams';this.region='all';this.leagueId='';app.filterSport('all');this.saveLocation();});teamContainer.append(b);
            }
            document.querySelectorAll('[data-region]').forEach(b => { const active = b.dataset.region === this.region; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
            document.querySelectorAll('[data-status]').forEach(b => { const active = b.dataset.status === this.status; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
            const refresh = document.getElementById('homeRefreshBtn');
            if (refresh) { refresh.disabled = this.busy; refresh.classList.toggle('refreshing', this.busy); }
            const matches = feeds.flatMap(f => f.matches.map(m => ({ ...m, feedState: f.state, mode: f.mode, fetchedAt: f.fetchedAt })));
            const filtered = C.filterMatches(matches, { date: this.date, region: this.region, sport: app.currentSport, status: this.status, query: this.query, favorites: this.favorites, favoriteTeams:new Set(this.favoriteTeams.keys()),leagueId:this.leagueId,team:this.activeTeam });
            const live = matches.filter(m => m.status === 'live' && m.feedState === 'ok' && m.mode === 'poll').length;
            document.getElementById('scoreTotal').textContent = matches.length;
            document.getElementById('scoreLive').textContent = live;
            document.getElementById('scoreUpcoming').textContent = matches.filter(m => m.status === 'upcoming').length;
            const issues = feeds.filter(f => f.state !== 'ok');
            const snapshots = feeds.filter(f => f.mode === 'snapshot');
            const notice = document.getElementById('scoreNotice');
            const messages = [];
            if (!navigator.onLine) messages.push('인터넷 연결이 끊겼습니다. 마지막으로 받은 정보를 표시합니다.');
            if (issues.length) messages.push(issues.length+'개 리그 지연 · '+(snapshots.length?'수집본':'마지막 기록'));
            if (snapshots.length && !issues.length) messages.push(this.busy?'수집본 · 최신 점수 확인 중':'수집본');
            notice.title=issues.map(f=>f.name).join(' · '); notice.hidden = !messages.length; document.getElementById('scoreNoticeText').textContent = messages.join(' ');
            container.setAttribute('aria-busy', String(this.busy));
            const statusEl = document.getElementById('apiStatus');
            if (statusEl) { const healthy = feeds.some(f => f.state === 'ok'); statusEl.classList.toggle('connected', healthy); statusEl.querySelector('.status-text').textContent = this.busy ? '조회 중' : healthy ? '데이터 연결' : '연결 확인'; }
            const dates = feeds.filter(f => f.fetchedAt).map(f => Date.parse(f.fetchedAt));
            document.getElementById('homeUpdateTime').textContent = dates.length ? clock(Math.min(...dates)) : '확인 중';
            const sourceStatus = document.getElementById('scoreSourceStatus');
            sourceStatus.textContent = this.busy ? '데이터 확인 중…' : !feeds.length || issues.length === feeds.length ? '데이터 연결 확인 필요' : issues.length ? '일부 공급 연결 지연' : snapshots.length ? '주기 수집본 사용 · 수집 시간 확인' : live ? '진행 경기 5초마다 확인' : '10초마다 데이터 확인';
            if (!this.rows) this.rows=new Map();
            if (!this.groups) this.groups=new Map();
            if (!filtered.length) {
                const emptyKey=JSON.stringify([this.busy,feeds.length,issues.length,this.query,this.status,this.favoriteTeams.size]);
                if(this.emptyKey===emptyKey&&container.querySelector('.score-empty'))return;
                this.emptyKey=emptyKey;container.replaceChildren();
                const empty = document.createElement('div'); empty.className = 'score-empty';
                const title = document.createElement('strong');
                title.textContent = this.busy ? '경기를 불러오고 있습니다' : !feeds.length || issues.length === feeds.length ? '경기 데이터를 확인할 수 없습니다' : this.query || this.status !== 'all' ? '조건에 맞는 경기가 없습니다' : '이 날짜에 등록된 경기가 없습니다';
                const text = document.createElement('p');
                text.textContent = this.busy ? '국내·해외 공급 데이터를 확인하고 있어요.' : this.status==='myteams' && !this.favoriteTeams.size ? '경기 상세의 ♡ 버튼으로 관심 팀을 등록해보세요.' : '날짜나 종목을 바꿔보세요. 연결 상태와 마지막 수집 시간도 확인할 수 있습니다.';
                empty.append(title, text); container.append(empty); return;
            }
            this.emptyKey='';
            const groups = new Map();
            filtered.forEach(m => { const key = m.leagueId; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m); });
            const visibleGroups=[],visibleRows=new Set();
            for (const [id, games] of groups) {
                const feed = feeds.find(f => f.id === id);
                let saved=this.groups.get(id);
                if(!saved){const group=document.createElement('section');group.className='score-league';const header=document.createElement('div');header.className='score-league-heading';const name=document.createElement('h3');name.textContent=(feed.region==='kr'?'🇰🇷 ':'')+feed.name;const meta=document.createElement('span');header.append(name,meta);group.append(header);saved={group,header,meta};this.groups.set(id,saved);}
                const {group,header,meta}=saved;
                meta.textContent = (feed.region === 'kr' ? '네이버 스포츠' : 'ESPN') + ' · ' + (feed.fetchedAt ? clock(feed.fetchedAt) : '미연결') + (feed.state === 'stale' ? ' · 갱신 지연' : feed.mode === 'snapshot' ? ' · 수집본' : '');
                const rowNodes=games.map(m=>{const key=m.leagueId+':'+m.id;visibleRows.add(key);const signature=JSON.stringify({...m,fetchedAt:undefined,favorite:this.favorites.has(m.id)});let savedRow=this.rows.get(key);if(!savedRow||savedRow.signature!==signature){savedRow={signature,node:this.row(m)};this.rows.set(key,savedRow);}savedRow.node._match=m;return savedRow.node;});
                const desired=[header,...rowNodes];
                if(desired.length!==group.children.length||desired.some((node,i)=>group.children[i]!==node))group.replaceChildren(...desired);
                visibleGroups.push(group);
            }
            if(visibleGroups.length!==container.children.length||visibleGroups.some((node,i)=>container.children[i]!==node))container.replaceChildren(...visibleGroups);
            for(const key of this.rows.keys())if(!visibleRows.has(key))this.rows.delete(key);
            for(const id of this.groups.keys())if(!groups.has(id))this.groups.delete(id);
        },
        row(m) {
            const row = document.createElement('div'); row.className = 'score-row' + (m.status === 'live' ? ' is-live' : '');
            const star = document.createElement('button'); star.className = 'score-star'; star.textContent = this.favorites.has(m.id) ? '★' : '☆';
            star.setAttribute('aria-label', m.awayTeam + ' 대 ' + m.homeTeam + ' 관심 경기'); star.setAttribute('aria-pressed', String(this.favorites.has(m.id)));
            star.addEventListener('click', () => {
                this.favorites.has(m.id) ? this.favorites.delete(m.id) : this.favorites.add(m.id);
                try { localStorage.setItem('sporton_match_favorites', JSON.stringify([...this.favorites])); } catch {}
                this.render();
            });
            const detail = document.createElement('button'); detail.className = 'score-match-button'; detail.setAttribute('aria-label', m.awayTeam + ' 대 ' + m.homeTeam + ' 경기 상세');
            const state = document.createElement('span'); state.className = 'score-state state-' + m.status;
            const isLive = m.status === 'live' && m.feedState === 'ok' && m.mode === 'poll';
            state.textContent = m.status === 'upcoming' && m.isoDate ? clock(m.isoDate).slice(0, 5) : isLive ? m.time : m.status === 'live' ? '마지막 기록' : C.LABELS[m.status];
            const teams = document.createElement('span'); teams.className = 'score-team-pair';
            for (const side of ['away', 'home']) {
                const team = document.createElement('span'); team.className = 'score-team';
                const logo = C.safeUrl(m[side + 'LogoUrl']);
                if (logo) { const img = document.createElement('img'); img.src = logo; img.alt = ''; img.loading = 'lazy'; img.addEventListener('error', () => img.remove()); team.append(img); }
                const name = document.createElement('span'); name.textContent = m[side + 'Team']; team.append(name);
                const value = document.createElement('b'); value.textContent = m[side + 'Score'] == null ? '—' : String(m[side + 'Score']); team.append(value); teams.append(team);
            }
            const source = document.createElement('span'); source.className = 'score-row-meta'; source.textContent = m.feedState !== 'ok' ? '갱신 지연' : m.mode === 'snapshot' ? '수집 기록' : C.LABELS[m.status];
            detail.append(state, teams, source); detail.addEventListener('click', () => app.showGameDetail(row._match || m));
            row.append(star, detail); return row;
        }
    };
    window.SportonScores = Scores;
    window.SportonCenter = Center;
    HomeDashboard.fetchAndRender = () => document.getElementById('scoreDate') ? Center.load() : Promise.resolve();
    HomeDashboard.startAutoRefresh = function () {
        this.stopAutoRefresh();
        this.refreshTimer = setInterval(() => {
            if (document.hidden || Center.busy || app.currentView !== 'home') return;
            const active = Center.feeds.some(f => f.mode === 'poll' && f.matches.some(m => m.status === 'live'));
            if (Date.now() - (Center.lastRequestAt || 0) >= (active ? 5000 : 10000)) Center.load();
        }, 1000);
    };
    const oldFilter = app.filterSport.bind(app);
    app.filterSport = function (sport) { oldFilter(sport); if (Center.leagueId && !C.LEAGUES.some(l=>l.id===Center.leagueId&&(sport==='all'||l.sport===sport))) Center.leagueId=''; Center.saveLocation(); if (this.currentView === 'home') Center.load(); };

    const Detail = {
        match:null, data:null, sequence:0, busy:false, lastRequestAt:0,
        async load() {
            if (!this.match || this.busy) return;
            const token=this.sequence, match=this.match;this.busy=true;this.lastRequestAt=Date.now();
            try {
                const data=await json((config.domesticApiBase||'').replace(/\/$/,'')+'/api/detail?league='+encodeURIComponent(match.leagueId)+'&id='+encodeURIComponent(match.providerId||match.id));
                if(token!==this.sequence)return;
                if(data.leagueId!==match.leagueId||!data.match||data.matchId!==String(match.providerId||match.id))throw new Error('Detail identity mismatch');
                if(data.match.region==='world')data.match={...data.match,homeTeam:KoreanNames.translateTeam(data.match.homeTeam),awayTeam:KoreanNames.translateTeam(data.match.awayTeam)};
                this.data=data;
            } catch {
                if(token!==this.sequence)return;
                this.data=this.data?{...this.data,state:'stale'}:{state:'error',match,periods:null,events:[],stats:[],fetchedAt:match.fetchedAt};
            } finally {if(token===this.sequence){this.busy=false;if(app.currentView==='gameDetail')this.render();}}
        },
        render() {
            const data=this.data||{match:this.match},m=data.match;
            const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
            document.getElementById('gameDetailTitle').textContent=m.awayTeam+' vs '+m.homeTeam;
            document.getElementById('gameDetailMeta').textContent=m.league+' · '+C.LABELS[m.status]+' · 한국 시간';
            const sb=document.getElementById('gameDetailScoreboard');sb.style.display='flex';sb.replaceChildren();
            for(const side of ['away','home']) {
                const team=el('div',m[side+'Team'],'gd-team');
                const follow=el('button',Center.favoriteTeams.has(C.teamKey(m,side))?'♥ 관심 팀':'♡ 관심 팀','score-follow');
                follow.setAttribute('aria-label',m[side+'Team']+' 관심 팀');follow.setAttribute('aria-pressed',String(Center.favoriteTeams.has(C.teamKey(m,side))));
                follow.addEventListener('click',()=>{Center.toggleTeam(m,side);this.render();});team.append(follow);sb.append(team);
                if(side==='away')sb.append(el('div',(m.awayScore??'—')+' : '+(m.homeScore??'—'),'gd-score'));
            }
            const body=document.getElementById('gameDetailBody');body.replaceChildren();const box=el('div',null,'score-detail');body.append(box);
            const actions=el('div',null,'score-detail-actions');const refresh=el('button',this.busy?'조회 중':'기록 새로고침','score-follow');refresh.disabled=this.busy;refresh.onclick=()=>this.load();actions.append(refresh);
            if(C.safeUrl(m.sourceUrl)){const a=el('a','제공처 경기 페이지 ↗');a.href=m.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';actions.append(a);}const calc=el('button','언오버 계산','score-follow');calc.addEventListener('click',()=>window.SportonOverUnder.useMatch(m));actions.append(calc);box.append(actions);
            box.append(el('p',m.time||C.LABELS[m.status]));
            const state=C.feedState({...data,mode:'poll',matches:[m]});
            box.append(el('p','제공: '+(m.region==='kr'?'네이버 스포츠':'ESPN')+' · 마지막 수집 '+(data.fetchedAt?clock(data.fetchedAt):'확인 중')+' · '+(m.status==='live'?'5초':'10초')+'마다 확인'));
            if(state!=='ok'&&this.data)box.append(el('p','연결이 지연되어 마지막 기록을 표시합니다. 아래 점수는 현재 점수와 다를 수 있습니다.','score-warning'));
            if(!this.data)box.append(el('p','상세 기록을 불러오고 있습니다.'));
            if(data.periods){
                box.append(el('h3',m.sport==='baseball'?'이닝별 점수':'구간별 점수'));
                const wrap=el('div',null,'score-detail-table'),table=el('table'),head=el('tr');
                for(const label of ['팀',...data.periods.labels,'합계'])head.append(el('th',label));table.append(head);
                for(const side of ['away','home']){const tr=el('tr');tr.append(el('th',m[side+'Team']));for(const value of [...data.periods[side],data.periods[side+'Total']])tr.append(el('td',value??'—'));table.append(tr);}wrap.append(table);box.append(wrap);
            }else if(m.sport==='baseball'||m.sport==='basketball'||m.sport==='hockey')box.append(el('p',m.status==='upcoming'?'경기가 시작되면 제공된 구간별 기록을 표시합니다.':'제공처에서 구간별 기록을 받지 못했습니다.'));
            if(m.sport==='soccer'){
                box.append(el('h3','득점 · 카드 기록'));
                for(const event of data.events||[]){const label={'goal':'⚽ 득점','own-goal':'⚽ 자책골','red':'🟥 퇴장','yellow':'🟨 경고'}[event.type]||'기록';box.append(el('p',(event.clock||'')+' '+label+' · '+(event.side?m[event.side+'Team']+' · ':'')+event.text));}
                if(!data.events?.length)box.append(el('p',m.status==='upcoming'?'경기 시작 전입니다.':data.recordAvailable?'현재 제공된 득점·카드 기록이 없습니다.':'제공처에서 상세 기록을 받지 못했습니다.'));
            }
            if(data.stats?.length){const wrap=el('div',null,'score-detail-table'),table=el('table');const head=el('tr');for(const label of [m.awayTeam,'기록',m.homeTeam])head.append(el('th',label));table.append(head);for(const stat of data.stats){const tr=el('tr');for(const value of [stat.away??'—',stat.label,stat.home??'—'])tr.append(el('td',value));table.append(tr);}wrap.append(table);box.append(wrap);}
            if(data.recordState==='error')box.append(el('p','상세 기록 공급 연결이 지연되고 있습니다.','score-warning'));
        }
    };
    window.SportonDetail=Detail;
    app.showGameDetail=function(match){this._prevView=this.currentView;this.switchView('gameDetail');Detail.sequence++;Detail.match=match;Detail.data=null;Detail.busy=false;Detail.lastRequestAt=0;Detail.render();Detail.load();GameDetailChat.destroy();GameDetailChat.init(match.id);};
    setInterval(()=>{if(document.hidden||app.currentView!=='gameDetail'||Detail.busy||!Detail.match)return;if(Date.now()-Detail.lastRequestAt>=(Detail.data?.match?.status==='live'||Detail.match.status==='live'?5000:10000))Detail.load();},1000);
    // Public Firebase config is initialized once, before legacy DOM ready handlers.
    if (config.firebase && typeof firebase !== 'undefined') {
        try { if (!firebase.apps.length) firebase.initializeApp(config.firebase); Community.db = firebase.firestore(); } catch (e) { console.warn('Firebase 초기화 실패'); }
    }
    document.addEventListener('DOMContentLoaded', () => { document.body.classList.toggle('score-no-chat',!config.firebase); Center.init(); if(app.currentView==='home')Center.load(); });
})();

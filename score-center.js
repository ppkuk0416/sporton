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
        if (old && Date.now() - old.at < 8000) return old.feeds;
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
                if (!f || !Array.isArray(f.matches) || !Number.isFinite(Date.parse(f.fetchedAt))) return { ...l, state: 'error', matches: [], mode };
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
        if (old && Date.now()-old.at < 8000) return old.data;
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
        if (old && Date.now() - old.at < 8000) return old.feeds;
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
        async load(date, region = 'all', sport = 'all') {
            const requests = [];
            if (region !== 'world') requests.push(domestic(date).then(fs => fs.filter(l => sport === 'all' || l.sport === sport)));
            if (region !== 'kr') requests.push(world(date, sport));
            return (await Promise.all(requests)).flat();
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
        date: C.kstDate(), region: 'kr', status: 'all', query: '', feeds: [], sequence: 0,
        favorites: new Set(), busy: false, lastDate: '',
        init() {
            try { this.favorites = new Set(JSON.parse(localStorage.getItem('sporton_match_favorites') || '[]')); } catch {}
            const params = new URLSearchParams(location.search);
            if (C.validDate(params.get('date'))) this.date = params.get('date');
            if (['kr', 'world', 'all'].includes(params.get('region'))) this.region = params.get('region');
            this.query = params.get('q') || '';
            const toolbar = document.getElementById('scoreToolbar');
            if (!toolbar) return;
            toolbar.innerHTML = `
                <div class="score-date-row">
                    <button class="score-icon-button" id="scorePrev" aria-label="전날 경기">‹</button>
                    <label class="score-date-label">경기 날짜 <input type="date" id="scoreDate" aria-label="경기 날짜" value="${this.date}"></label>
                    <button class="score-icon-button" id="scoreNext" aria-label="다음날 경기">›</button>
                    <button class="score-chip" id="scoreToday">오늘</button>
                    <span class="score-timezone">한국 시간 · KST</span>
                </div>
                <div class="score-region-tabs" aria-label="경기 지역">
                    <button class="score-chip" data-region="kr">🇰🇷 국내</button>
                    <button class="score-chip" data-region="world">해외</button>
                    <button class="score-chip" data-region="all">전체</button>
                </div>
                <div class="score-filter-row">
                    <div class="score-status-tabs" aria-label="경기 상태">
                        <button class="score-chip active" data-status="all">전체</button>
                        <button class="score-chip" data-status="live">🔴 진행 중</button>
                        <button class="score-chip" data-status="upcoming">예정</button>
                        <button class="score-chip" data-status="finished">종료</button>
                        <button class="score-chip" data-status="favorites">★ 관심 경기</button>
                    </div>
                    <label class="score-search"><span aria-hidden="true">⌕</span><input type="search" id="scoreSearch" placeholder="팀 또는 리그 검색" aria-label="팀 또는 리그 검색" maxlength="80"></label>
                </div>`;
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
                this.region = b.dataset.region; this.saveLocation(); this.load();
            }));
            toolbar.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', () => {
                this.status = b.dataset.status; this.render();
            }));
            document.getElementById('scoreSearch').addEventListener('input', e => { this.query = e.target.value; this.render(); this.saveLocation(); });
            document.getElementById('scoreRetry').addEventListener('click', () => this.load(true));
            document.addEventListener('visibilitychange', () => { if (!document.hidden && app.currentView === 'home') this.load(); });
            window.addEventListener('online', () => this.load(true));
            window.addEventListener('offline', () => this.render());
            this.render();
        },
        saveLocation() {
            const url = new URL(location.href);
            url.searchParams.set('date', this.date); url.searchParams.set('region', this.region);
            if (this.query) url.searchParams.set('q', this.query); else url.searchParams.delete('q');
            history.replaceState(history.state, '', url);
        },
        async load(force = false) {
            const token = ++this.sequence;
            if (force) Scores.invalidate();
            this.busy = true; this.render();
            const date = this.date, region = this.region, sport = app.currentSport;
            const feeds = await Scores.load(date, region, sport);
            if (token !== this.sequence) return;
            this.feeds = feeds; this.lastDate = date; this.busy = false; this.render();
        },
        render() {
            const container = document.getElementById('homeGamesContainer');
            if (!container || !document.getElementById('scoreToolbar')) return;
            const feeds = this.lastDate === this.date ? this.feeds.filter(l =>
                (this.region === 'all' || l.region === this.region) &&
                (app.currentSport === 'all' || l.sport === app.currentSport)) : [];
            document.querySelectorAll('[data-region]').forEach(b => { const active = b.dataset.region === this.region; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
            document.querySelectorAll('[data-status]').forEach(b => { const active = b.dataset.status === this.status; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
            const refresh = document.getElementById('homeRefreshBtn');
            if (refresh) { refresh.disabled = this.busy; refresh.classList.toggle('refreshing', this.busy); }
            const matches = feeds.flatMap(f => f.matches.map(m => ({ ...m, feedState: f.state, mode: f.mode, fetchedAt: f.fetchedAt })));
            const filtered = C.filterMatches(matches, { date: this.date, region: this.region, sport: app.currentSport, status: this.status, query: this.query, favorites: this.favorites });
            const live = matches.filter(m => m.status === 'live' && m.feedState === 'ok' && m.mode === 'poll').length;
            document.getElementById('scoreTotal').textContent = matches.length;
            document.getElementById('scoreLive').textContent = live;
            document.getElementById('scoreUpcoming').textContent = matches.filter(m => m.status === 'upcoming').length;
            const issues = feeds.filter(f => f.state !== 'ok');
            const snapshots = feeds.filter(f => f.mode === 'snapshot');
            const notice = document.getElementById('scoreNotice');
            const messages = [];
            if (!navigator.onLine) messages.push('인터넷 연결이 끊겼습니다. 마지막으로 받은 정보를 표시합니다.');
            if (issues.length) messages.push(issues.map(f => f.name).join(' · ') + ': 연결 실패 또는 갱신 지연. 경기 없음으로 판단하지 마세요.');
            if (snapshots.length) messages.push('일부 경기는 주기 수집 데이터입니다. 수집은 약 5분 간격이며 지연될 수 있습니다.');
            notice.hidden = !messages.length; document.getElementById('scoreNoticeText').textContent = messages.join(' ');
            container.setAttribute('aria-busy', String(this.busy));
            const statusEl = document.getElementById('apiStatus');
            if (statusEl) { const healthy = feeds.some(f => f.state === 'ok'); statusEl.classList.toggle('connected', healthy); statusEl.querySelector('.status-text').textContent = this.busy ? '조회 중' : healthy ? '데이터 연결' : '연결 확인'; }
            const dates = feeds.filter(f => f.fetchedAt).map(f => Date.parse(f.fetchedAt));
            document.getElementById('homeUpdateTime').textContent = dates.length ? clock(Math.min(...dates)) : '확인 중';
            const sourceStatus = document.getElementById('scoreSourceStatus');
            sourceStatus.textContent = this.busy ? '데이터 확인 중…' : !feeds.length || issues.length === feeds.length ? '데이터 연결 확인 필요' : issues.length ? '일부 공급 연결 지연' : snapshots.length ? '주기 수집본 사용 · 수집 시간 확인' : '10초마다 데이터 확인';
            container.replaceChildren();
            if (!filtered.length) {
                const empty = document.createElement('div'); empty.className = 'score-empty';
                const title = document.createElement('strong');
                title.textContent = this.busy ? '경기를 불러오고 있습니다' : !feeds.length || issues.length === feeds.length ? '경기 데이터를 확인할 수 없습니다' : this.query || this.status !== 'all' ? '조건에 맞는 경기가 없습니다' : '이 날짜에 등록된 경기가 없습니다';
                const text = document.createElement('p');
                text.textContent = this.busy ? '국내·해외 공급 데이터를 확인하고 있어요.' : '날짜나 종목을 바꿔보세요. 연결 상태와 마지막 수집 시간도 확인할 수 있습니다.';
                empty.append(title, text); container.append(empty); return;
            }
            const groups = new Map();
            filtered.forEach(m => { const key = m.leagueId; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m); });
            for (const [id, games] of groups) {
                const feed = feeds.find(f => f.id === id), group = document.createElement('section');
                group.className = 'score-league';
                const header = document.createElement('div'); header.className = 'score-league-heading';
                const name = document.createElement('h3'); name.textContent = (feed.region === 'kr' ? '🇰🇷 ' : '') + feed.name;
                const meta = document.createElement('span');
                meta.textContent = (feed.region === 'kr' ? '네이버 스포츠' : 'ESPN') + ' · ' + (feed.fetchedAt ? clock(feed.fetchedAt) : '미연결') + (feed.state === 'stale' ? ' · 갱신 지연' : feed.mode === 'snapshot' ? ' · 수집본' : '');
                header.append(name, meta); group.append(header);
                games.forEach(m => group.append(this.row(m))); container.append(group);
            }
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
            detail.append(state, teams, source); detail.addEventListener('click', () => app.showGameDetail(m));
            row.append(star, detail); return row;
        }
    };
    window.SportonScores = Scores;
    window.SportonCenter = Center;
    HomeDashboard.fetchAndRender = () => Center.load();
    HomeDashboard.startAutoRefresh = function () {
        this.stopAutoRefresh();
        this.refreshTimer = setInterval(() => { if (!document.hidden && !Center.busy) Center.load(); }, 10000);
    };
    const oldFilter = app.filterSport.bind(app);
    app.filterSport = function (sport) { oldFilter(sport); if (this.currentView === 'home') Center.load(); };
    const oldDetail = app.showGameDetail.bind(app);
    app.showGameDetail = function (match) {
        if (match.region !== 'kr') { oldDetail(match); return; }
        this._prevView = this.currentView; this.switchView('gameDetail');
        document.getElementById('gameDetailTitle').textContent = match.awayTeam + ' vs ' + match.homeTeam;
        document.getElementById('gameDetailMeta').textContent = match.league + ' · ' + C.LABELS[match.status] + ' · 한국 시간';
        const sb = document.getElementById('gameDetailScoreboard'); sb.style.display = 'flex';
        sb.innerHTML = '<div class="gd-team">' + esc(match.awayTeam) + '</div><div class="gd-score-block"><div class="gd-score">' + esc(match.awayScore ?? '—') + ' : ' + esc(match.homeScore ?? '—') + '</div></div><div class="gd-team">' + esc(match.homeTeam) + '</div>';
        const body = document.getElementById('gameDetailBody');
        body.innerHTML = '<div class="score-detail"><h3>경기 정보</h3><p>' + esc(match.time) + '</p><p>데이터 제공: 네이버 스포츠 · 마지막 수집 ' + esc(match.fetchedAt ? clock(match.fetchedAt) : '확인 중') + '</p><p>국내 경기의 상세 기록과 문자 중계는 데이터 제공 페이지에서 확인할 수 있습니다.</p></div>';
        if (C.safeUrl(match.sourceUrl)) { const link = document.createElement('a'); link.href = match.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'btn btn-primary'; link.textContent = '네이버 스포츠 문자 중계 ↗'; body.firstElementChild.append(link); }
        GameDetailChat.destroy(); GameDetailChat.init(match.id);
    };
    // Public Firebase config is initialized once, before legacy DOM ready handlers.
    if (config.firebase && typeof firebase !== 'undefined') {
        try { if (!firebase.apps.length) firebase.initializeApp(config.firebase); Community.db = firebase.firestore(); } catch (e) { console.warn('Firebase 초기화 실패'); }
    }
    document.addEventListener('DOMContentLoaded', () => { Center.init(); Center.load(); });
})();

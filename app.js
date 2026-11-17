/* SPORTON application shell: view routing, sport selection and toasts.
   Score loading, rendering and detail records live in score-center.js. */
(function (root) {
    'use strict';
    const SPORT_NAMES = { all: '전체', soccer: '축구', basketball: '농구', baseball: '야구', volleyball: '배구', hockey: '하키', football: '미식축구' };
    const VIEWS = ['home', 'gameDetail'];
    const LEGACY_STATUS = { live: 'live', upcoming: 'upcoming', myteam: 'myteams', myteams: 'myteams' };
    const TITLE = 'SPORTON — 국내·해외 스포츠 스코어';

    const Animations = {
        showToast(message, type = 'info', duration = 3200) {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = 'toast ' + (['success', 'error', 'info'].includes(type) ? type : 'info');
            toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
            toast.textContent = String(message ?? '');
            container.append(toast);
            setTimeout(() => { toast.classList.add('is-leaving'); setTimeout(() => toast.remove(), 240); }, duration);
        }
    };

    // Display names only. League registry and data sources are owned by sports-core.js.
    const ApiService = { sportConfig: Object.fromEntries(Object.entries(SPORT_NAMES).filter(([id]) => id !== 'all').map(([id, name]) => [id, { name }])) };
    // Soccer standings are rendered by football-standings.js; other sports have no standings view.
    const StandingsService = { init() {} };
    // score-center.js installs fetchAndRender and startAutoRefresh.
    const HomeDashboard = {
        refreshTimer: null,
        init() {},
        fetchAndRender() { return Promise.resolve(); },
        startAutoRefresh() {},
        stopAutoRefresh() { clearInterval(this.refreshTimer); this.refreshTimer = null; }
    };

    const app = {
        currentView: 'home',
        currentSport: 'all',
        _prevView: 'home',
        switchView(view, push = true) {
            if (LEGACY_STATUS[view] && root.SportonCenter) root.SportonCenter.status = LEGACY_STATUS[view];
            if (!VIEWS.includes(view)) view = 'home';
            const entering = view === 'gameDetail' && this.currentView !== 'gameDetail';
            this.currentView = view;
            document.querySelectorAll('.content-section').forEach(section => section.classList.toggle('active', section.id === (view === 'gameDetail' ? 'gameDetailSection' : 'homeSection')));
            document.body.classList.toggle('view-home', view === 'home');
            document.body.classList.toggle('view-detail', view === 'gameDetail');
            if (view === 'home') {
                document.title = TITLE;
                HomeDashboard.init();
                HomeDashboard.startAutoRefresh();
            } else {
                HomeDashboard.stopAutoRefresh();
            }
            const status = root.SportonCenter?.status;
            document.querySelectorAll('[data-score-nav]').forEach(link => {
                const active = view === 'home' && link.dataset.scoreNav === (status === 'live' ? 'live' : status === 'myteams' ? 'myteams' : 'today');
                link.classList.toggle('active', active);
                if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
            });
            // Opening a match adds one history entry so the device back button returns to the list.
            if (entering && push) { try { history.pushState({ view: 'gameDetail' }, '', location.href); } catch {} }
            if (entering) root.scrollTo?.({ top: 0 });
        },
        goBack() {
            if (history.state?.view === 'gameDetail') history.back();
            else this.switchView('home');
        },
        filterSport(sport) {
            this.currentSport = SPORT_NAMES[sport] ? sport : 'all';
            document.querySelectorAll('.sport-tab').forEach(tab => {
                const active = tab.dataset.sport === this.currentSport;
                tab.classList.toggle('active', active);
                tab.setAttribute('aria-pressed', String(active));
            });
        },
        init() {
            document.querySelectorAll('.sport-tab').forEach(tab => tab.addEventListener('click', () => this.filterSport(tab.dataset.sport)));
            document.getElementById('gameDetailBack')?.addEventListener('click', () => this.goBack());
            document.getElementById('logoHome')?.addEventListener('click', () => document.querySelector('[data-score-nav="today"]')?.click());
            // Retire the legacy "#home" style hashes without adding history entries.
            if (/^#(home|live|upcoming|myteam|community|gameDetail)?$/.test(location.hash)) {
                try { history.replaceState({ view: 'home' }, '', location.pathname + location.search); } catch {}
            }
            this.switchView('home', false);
        }
    };

    root.addEventListener('popstate', event => {
        const params = new URLSearchParams(location.search);
        const detail = event.state?.view === 'gameDetail' && params.has('match') && params.has('matchLeague');
        app.switchView(detail ? 'gameDetail' : 'home', false);
    });
    document.addEventListener('DOMContentLoaded', () => app.init());
    if ('serviceWorker' in navigator) root.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));

    Object.assign(root, { app, Animations, ApiService, StandingsService, HomeDashboard });
})(window);

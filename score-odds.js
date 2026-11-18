/* SPORTON odds comparison: 1X2 per bookmaker in each priced row (accordion) and in match details.
   Data comes from /api/odds (server-side provider key). With ?odds=demo it uses clearly labelled sample
   prices for layout work; production never shows sample prices. Loaded before score-center.js. */
(function (root) {
    'use strict';
    const O = root.SportonOddsCore, config = root.SPORTON_CONFIG || {};
    if (!O) return;
    const demo = new URLSearchParams(location.search).get('odds') === 'demo';
    const byDate = new Map(), open = new Set();
    const REFRESH_MS = 60000;
    const LABELS = { home: '홈승', draw: '무', away: '원정승', over: '오버', under: '언더' };
    const SHORT = { home: '홈', draw: '무', away: '원정' };
    // Rows show the away team left and the home team right, so prices follow the same order.
    const ORDER = { h2h: ['away', 'draw', 'home'], totals: ['over', 'under'] };
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const fmt = value => value == null ? '-' : Number(value).toFixed(2);
    const clock = value => { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : ''; };

    function ensure(date, matches, onChange) {
        if (demo || !matches.some(O.applies)) return;
        const state = byDate.get(date) || { status: 'idle', at: 0, retryAt: 0, data: null };
        byDate.set(date, state);
        const now = Date.now();
        if (state.status === 'loading' || now < state.retryAt || (state.data && now - state.at < REFRESH_MS)) return;
        state.status = 'loading';
        fetch((config.domesticApiBase || '').replace(/\/$/, '') + '/api/odds?date=' + encodeURIComponent(date), { cache: 'no-store', signal: AbortSignal.timeout(12000) })
            .then(async res => {
                const data = await res.json().catch(() => null);
                if (res.status === 503 || res.status === 404 || data?.state === 'unconfigured') { state.status = 'off'; state.retryAt = Date.now() + 30 * 60000; return; }
                if (!res.ok || data?.version !== 1 || data.date !== date || typeof data.events !== 'object') throw new Error('odds ' + res.status);
                Object.assign(state, { status: 'ready', at: Date.now(), data }); onChange?.();
            })
            .catch(() => {
                // Keep the last board visible but mark it stale; retry later instead of every render.
                state.status = state.data ? 'ready' : 'off'; state.retryAt = Date.now() + 2 * 60000;
                if (state.data && state.data.state !== 'stale') { state.data = { ...state.data, state: 'stale' }; onChange?.(); }
            });
    }

    // null = no odds UI for this match; books [] = priced league, nothing offered yet ("-").
    function forMatch(m) {
        if (!O.applies(m)) return null;
        if (demo) return { state: 'demo', source: '예시 데이터', bookmakers: O.DEFAULT_BOOKMAKERS.map(key => ({ key, name: O.bookName(key) })), books: O.demoBooks(m) };
        const data = byDate.get(m.rawDate)?.data;
        if (!data || !['ok', 'partial', 'stale'].includes(data.state)) return null;
        const entry = data.events[m.id];
        return { state: data.state === 'stale' ? 'stale' : 'ok', source: data.source, fetchedAt: data.fetchedAt, bookmakers: data.bookmakers, books: entry?.books || [] };
    }
    // One row per configured bookmaker, in configured order, so missing prices read as "-".
    const rows = odds => odds.bookmakers.map(b => odds.books.find(x => x.key === b.key) || { key: b.key, name: b.name, h2h: null, totals: null });

    function priceCell(entry, top) {
        const td = el('td', 'score-odds-price');
        const best = entry?.price != null && top?.price === entry.price;
        if (best) td.classList.add('is-best');
        td.append(el('span', '', fmt(entry?.price)));
        const direction = O.trend(entry);
        if (direction) {
            const arrow = el('span', 'score-odds-trend is-' + direction, direction === 'up' ? '▲' : '▼');
            arrow.setAttribute('aria-hidden', 'true'); td.append(arrow);
            td.append(el('span', 'score-sr-only', (direction === 'up' ? ' 상승, 직전 ' : ' 하락, 직전 ') + fmt(entry.previous)));
        }
        if (best) td.append(el('span', 'score-sr-only', ' 최고 배당'));
        return td;
    }
    function table(m, odds, market, teamHeads = false) {
        const list = rows(odds), top = O.best(list, market), outcomes = ORDER[market];
        const wrap = el('div', 'score-odds-table-wrap'), t = el('table', 'score-odds-table');
        const point = market === 'totals' ? list.find(b => b.totals)?.totals.point : null;
        t.append(el('caption', 'score-sr-only', market === 'h2h' ? m.awayTeam + ' 대 ' + m.homeTeam + ' 승무패 배당' : '기준 ' + point + ' 오버/언더 배당'));
        const head = el('tr'); head.append(el('th', '', '사이트'));
        for (const outcome of outcomes) {
            const th = el('th', '', market === 'totals' ? LABELS[outcome] + ' ' + (point ?? '') : LABELS[outcome]);
            th.scope = 'col';
            if (market === 'h2h' && outcome !== 'draw') { const team = outcome === 'home' ? m.homeTeam : m.awayTeam; th.title = team + ' 승'; if (teamHeads) { th.textContent = ''; th.append(el('span', 'score-odds-team', team), el('small', '', outcome === 'home' ? '홈' : '원정')); } }
            head.append(th);
        }
        head.firstChild.scope = 'col';
        const thead = el('thead'); thead.append(head); const tbody = el('tbody');
        for (const book of list) {
            const tr = el('tr'), name = el('th', '', book.name || O.bookName(book.key)); name.scope = 'row'; tr.append(name);
            const line = book[market];
            for (const outcome of outcomes) tr.append(priceCell(market === 'totals' && line && line.point !== point ? null : line?.[outcome], top[outcome]));
            tbody.append(tr);
        }
        t.append(thead, tbody); wrap.append(t); return wrap;
    }
    function badge(odds) {
        if (odds.state === 'demo') return el('span', 'score-odds-tag is-demo', '예시');
        if (odds.state === 'stale') return el('span', 'score-odds-tag is-stale', '갱신 지연');
        return null;
    }

    function rowStrip(m) {
        const odds = m.odds; if (!odds) return null;
        const details = el('details', 'score-odds'); details.open = open.has(m.id);
        details.addEventListener('toggle', () => { details.open ? open.add(m.id) : open.delete(m.id); });
        const summary = el('summary', 'score-odds-summary');
        summary.append(el('span', 'score-odds-title', '배당'));
        const tag = badge(odds); if (tag) summary.append(tag);
        const top = O.best(odds.books, 'h2h'), priced = odds.books.some(b => b.h2h);
        const best = el('span', 'score-odds-best');
        for (const outcome of ORDER.h2h) {
            const cell = el('span', 'score-odds-best-item'); cell.append(el('small', '', SHORT[outcome]), el('b', '', fmt(top[outcome]?.price)));
            best.append(cell);
        }
        summary.append(best);
        summary.setAttribute('aria-label', '배당 비교 ' + (priced ? '최고 원정승 ' + fmt(top.away?.price) + ', 무 ' + fmt(top.draw?.price) + ', 홈승 ' + fmt(top.home?.price) : '집계 전') + (odds.state === 'demo' ? ', 예시 데이터' : ''));
        summary.append(el('span', 'score-odds-chevron'));
        details.append(summary);
        const body = el('div', 'score-odds-body');
        body.append(table(m, odds, 'h2h'));
        body.append(el('p', 'score-odds-note', priced ? '가장 높은 배당을 강조합니다. ▲▼는 직전 배당 대비 변동입니다.' : '아직 집계된 배당이 없습니다.'));
        details.append(body);
        return details;
    }

    function detail(m) {
        const odds = forMatch(m); if (!odds) return null;
        const box = el('section', 'score-odds-detail'); box.setAttribute('aria-labelledby', 'scoreOddsDetailTitle');
        const title = el('h3', '', '배당 비교'); title.id = 'scoreOddsDetailTitle'; const tag = badge(odds); if (tag) title.append(tag);
        box.append(title, el('h4', '', '승무패 (1X2)'), table(m, odds, 'h2h', true));
        if (odds.books.some(b => b.totals)) box.append(el('h4', '', '언더/오버'), table(m, odds, 'totals'));
        const updated = odds.books.map(b => Date.parse(b.updatedAt)).filter(Number.isFinite);
        box.append(el('p', 'score-odds-note', odds.state === 'demo'
            ? '예시 데이터입니다. 실제 북메이커 배당이 아니며 화면 구성 확인용입니다.'
            : '제공: ' + (odds.source || '배당 제공처') + (updated.length ? ' · 사이트 최종 갱신 ' + clock(Math.max(...updated)) : '') + ' · 소수 배당 · 참고용 정보이며 베팅을 권유하지 않습니다.'));
        return box;
    }

    root.SportonOdds = { demo, ensure, forMatch, rowStrip, detail };
})(window);

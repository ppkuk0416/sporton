/* Use the provider's team artwork consistently across score views. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else { root.SportonTeamLogos = api; api.loadCatalog().catch(() => {}); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const placeholder = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3 4 6v6c0 4 4 7 8 9 4-2 8-5 8-9V6l-8-3Z"/></svg>';
    let catalog = new Map();
    function key(match, side) {
        const id = match?.[side + 'TeamId'];
        if (!['home','away'].includes(side) || typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id) || !/^[a-z0-9_.]+$/.test(match?.leagueId || '')) return '';
        const provider = match.region === 'kr' ? 'naver' : match.region === 'world' ? 'espn' : '';
        return provider ? provider + ':' + match.leagueId + ':' + id : '';
    }
    function safe(value) {
        try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
    }
    function url(match, side) {
        if (!['home','away'].includes(side)) return '';
        return safe(match?.[side + 'LogoUrl']) || catalog.get(key(match, side)) || '';
    }
    function setCatalog(value) {
        if (value?.version !== 1 || !Array.isArray(value.teams)) throw Error('Invalid team catalog');
        const next = new Map();
        for (const team of value.teams) {
            const expected = key({leagueId:team.leagueId,region:team.provider==='naver'?'kr':team.provider==='espn'?'world':'',homeTeamId:team.teamId},'home');
            if (!expected || expected !== team.key || next.has(expected) || team.logo?.url && !safe(team.logo.url)) throw Error('Invalid team identity or logo in catalog');
            next.set(expected, safe(team.logo?.url));
        }
        catalog = next;
    }
    async function loadCatalog(fetcher = fetch) {
        const response = await fetcher('/data/teams/catalog.json', {cache:'no-store', signal:AbortSignal.timeout(10000)});
        if (!response.ok) throw Error('Team catalog unavailable');
        setCatalog(await response.json());
        if (typeof document !== 'undefined') {
            for (const frame of document.querySelectorAll('[data-team-key]')) {
                const source = catalog.get(frame.dataset.teamKey);
                if (!source || frame.querySelector('img')) continue;
                const image = document.createElement('img');
                image.alt = ''; image.width = 32; image.height = 32; image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer'; image.src = source;
                frame.classList.remove('team-logo-unavailable'); frame.append(image); hydrate(frame);
            }
        }
    }

    function html(match, side) {
        const source = url(match, side);
        // The adjacent team name supplies the accessible label. Artwork is decorative.
        return '<span class="team-logo' + (source ? '' : ' team-logo-unavailable') + '" data-team-logo data-team-key="' + escape(key(match,side)) + '" aria-hidden="true">' +
            '<span class="team-logo-placeholder">' + placeholder + '</span>' +
            (source ? '<img src="' + escape(source) + '" alt="" width="32" height="32" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + '</span>';
    }

    function hydrate(scope) {
        scope.querySelectorAll('[data-team-logo] img').forEach(image => {
            if (image.dataset.logoBound) return;
            image.dataset.logoBound = 'true';
            const frame = image.closest('[data-team-logo]');
            const loaded = () => {
                frame.classList.add('team-logo-loaded');
                frame.classList.remove('team-logo-unavailable');
            };
            const failed = () => {
                frame.classList.remove('team-logo-loaded');
                frame.classList.add('team-logo-unavailable');
                frame.title = '팀 로고를 불러오지 못했습니다';
            };
            image.addEventListener('load', loaded);
            image.addEventListener('error', failed);
            // Cached images may finish before this view is hydrated.
            if (image.complete) image.naturalWidth > 0 ? loaded() : failed();
        });
    }

    function create(match, side) {
        const host = document.createElement('span');
        host.innerHTML = html(match, side);
        hydrate(host);
        return host.firstElementChild;
    }

    return { key, url, html, hydrate, create, setCatalog, loadCatalog };
});

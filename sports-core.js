/* Shared, dependency-free score normalization. Fixtures are only used in tests. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.SportonCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const LEAGUES = [
        { id: 'kbo', name: 'KBO', sport: 'baseball', section: 'kbaseball', region: 'kr', source: 'naver' },
        { id: 'kleague', name: 'K리그1', sport: 'soccer', section: 'kfootball', region: 'kr', source: 'naver' },
        { id: 'kleague2', name: 'K리그2', sport: 'soccer', section: 'kfootball', region: 'kr', source: 'naver' },
        { id: 'kbl', name: 'KBL', sport: 'basketball', section: 'basketball', region: 'kr', source: 'naver' },
        { id: 'wkbl', name: 'WKBL', sport: 'basketball', section: 'basketball', region: 'kr', source: 'naver' },
        { id: 'kovo', name: 'V리그 남자', sport: 'volleyball', section: 'volleyball', region: 'kr', source: 'naver' },
        { id: 'wkovo', name: 'V리그 여자', sport: 'volleyball', section: 'volleyball', region: 'kr', source: 'naver' },
        { id: 'eng.1', name: 'EPL', sport: 'soccer', path: 'soccer/eng.1', region: 'world', source: 'espn' },
        { id: 'nba', name: 'NBA', sport: 'basketball', path: 'basketball/nba', region: 'world', source: 'espn' },
        { id: 'mlb', name: 'MLB', sport: 'baseball', path: 'baseball/mlb', region: 'world', source: 'espn' },
        { id: 'esp.1', name: '라리가', sport: 'soccer', path: 'soccer/esp.1', region: 'world', source: 'espn' },
        { id: 'ger.1', name: '분데스리가', sport: 'soccer', path: 'soccer/ger.1', region: 'world', source: 'espn' },
        { id: 'ita.1', name: '세리에A', sport: 'soccer', path: 'soccer/ita.1', region: 'world', source: 'espn' },
        { id: 'fra.1', name: '리그앙', sport: 'soccer', path: 'soccer/fra.1', region: 'world', source: 'espn' },
        { id: 'uefa.champions', name: '챔피언스리그', sport: 'soccer', path: 'soccer/uefa.champions', region: 'world', source: 'espn' },
        { id: 'nhl', name: 'NHL', sport: 'hockey', path: 'hockey/nhl', region: 'world', source: 'espn' },
        { id: 'nfl', name: 'NFL', sport: 'football', path: 'football/nfl', region: 'world', source: 'espn' }
    ];
    const LABELS = { live: '진행 중', upcoming: '예정', finished: '종료', postponed: '연기', cancelled: '취소', suspended: '중단', delayed: '지연', unknown: '상태 확인 중' };
    function kstDate(value = new Date()) {
        const d = new Date(value);
        if (!Number.isFinite(d.getTime())) throw new Error('Invalid date');
        return new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10);
    }
    function validDate(date) {
        return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
            && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
    }
    function shiftDate(date, days) {
        if (!validDate(date)) throw new Error('Invalid date');
        return new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);
    }
    function safeUrl(value) {
        try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
    }
    function score(value) {
        if (value === null || value === undefined || value === '') return null;
        const n = Number(value);
        return Number.isFinite(n) && n >= 0 ? n : null;
    }
    function normalizeNaver(data, league) {
        if (data?.success !== true || !Array.isArray(data?.result?.games)) throw new Error('국내 공급 응답 형식 오류');
        const states = { BEFORE: 'upcoming', STARTED: 'live', PLAY: 'live', PLAYING: 'live', IN_PROGRESS: 'live', RESULT: 'finished', END: 'finished', CANCEL: 'cancelled', POSTPONED: 'postponed', SUSPENDED: 'suspended', DELAY: 'delayed' };
        return data.result.games.filter(g => g.categoryId === league.id && g.gameId && g.homeTeamName && g.awayTeamName).map(g => {
            let status = states[g.statusCode] || 'unknown';
            if (g.cancel) status = 'cancelled';
            else if (g.suspended) status = 'suspended';
            const isoDate = typeof g.gameDateTime === 'string'
                ? g.gameDateTime.replace(/(Z|[+-]\d\d:\d\d)$/, '') + '+09:00' : '';
            const scored = ['live', 'finished', 'suspended', 'delayed'].includes(status);
            return {
                id: 'naver:' + g.gameId, providerId: String(g.gameId), source: '네이버 스포츠',
                leagueId: league.id, league: league.name, sport: league.sport, region: 'kr',
                homeTeam: String(g.homeTeamName), awayTeam: String(g.awayTeamName),
                homeScore: scored ? score(g.homeTeamScore) : null, awayScore: scored ? score(g.awayTeamScore) : null,
                homeLogoUrl: safeUrl(g.homeTeamEmblemUrl), awayLogoUrl: safeUrl(g.awayTeamEmblemUrl),
                status, time: status === 'live' || status === 'suspended' || status === 'delayed'
                    ? String(g.statusInfo || LABELS[status]) : LABELS[status],
                rawDate: validDate(g.gameDate) ? g.gameDate : (isoDate ? kstDate(isoDate) : ''),
                isoDate, sourceUrl: 'https://m.sports.naver.com/game/' + encodeURIComponent(g.gameId) + '/relay'
            };
        });
    }
    function normalizeESPN(data, league, translate = value => value) {
        if (!Array.isArray(data?.events)) throw new Error('ESPN 응답 형식 오류');
        return data.events.map(ev => {
            const comp = ev.competitions?.[0];
            const h = comp?.competitors?.find(c => c.homeAway === 'home');
            const a = comp?.competitors?.find(c => c.homeAway === 'away');
            if (!h?.team || !a?.team || !ev.id || !ev.date || !Number.isFinite(Date.parse(ev.date))) return null;
            const type = ev.status?.type || comp.status?.type || {};
            const special = { STATUS_POSTPONED: 'postponed', STATUS_CANCELED: 'cancelled', STATUS_CANCELLED: 'cancelled', STATUS_SUSPENDED: 'suspended', STATUS_DELAY: 'delayed', STATUS_DELAYED: 'delayed' };
            let status = special[type.name] || (type.completed || type.state === 'post' ? 'finished' : type.state === 'in' ? 'live' : type.state === 'pre' ? 'upcoming' : 'unknown');
            let time = LABELS[status];
            if (status === 'live') time = ev.status?.type?.shortDetail || ev.status?.displayClock || '진행 중';
            const hasScore = ['live', 'finished', 'suspended', 'delayed'].includes(status);
            return {
                id: String(ev.id), source: 'ESPN', leagueId: league.id, league: league.name,
                sport: league.sport, region: 'world', status, time, rawDate: kstDate(ev.date), isoDate: ev.date,
                homeTeam: translate(h.team.displayName || h.team.shortDisplayName || ''),
                awayTeam: translate(a.team.displayName || a.team.shortDisplayName || ''),
                homeScore: hasScore ? score(h.score) : null, awayScore: hasScore ? score(a.score) : null,
                homeLogoUrl: safeUrl(h.team.logo), awayLogoUrl: safeUrl(a.team.logo),
                period: ev.status?.period || 0, clock: ev.status?.displayClock || '',
                sourceUrl: safeUrl(ev.links?.[0]?.href)
            };
        }).filter(Boolean);
    }
    function filterMatches(matches, options = {}) {
        const query = (options.query || '').trim().toLocaleLowerCase('ko-KR');
        return matches.filter(m =>
            (!options.date || m.rawDate === options.date) &&
            (!options.region || options.region === 'all' || m.region === options.region) &&
            (!options.sport || options.sport === 'all' || m.sport === options.sport) &&
            (!options.status || options.status === 'all' || m.status === options.status ||
                (options.status === 'favorites' && options.favorites?.has(m.id))) &&
            (!query || [m.homeTeam, m.awayTeam, m.league].join(' ').toLocaleLowerCase('ko-KR').includes(query))
        ).sort((a, b) => {
            const order = { live: 0, delayed: 1, suspended: 2, upcoming: 3, finished: 4, postponed: 5, cancelled: 6, unknown: 7 };
            return (order[a.status] - order[b.status]) || (a.region === b.region ? 0 : a.region === 'kr' ? -1 : 1)
                || a.league.localeCompare(b.league, 'ko') || a.isoDate.localeCompare(b.isoDate);
        });
    }
    return { LEAGUES, LABELS, kstDate, validDate, shiftDate, safeUrl, normalizeNaver, normalizeESPN, filterMatches };
});

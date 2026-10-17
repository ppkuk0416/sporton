'use strict';

const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g,'');

async function collectNbaOdds(db, config, fetcher = fetch) {
    if (!config.oddsApiKey) return { state:'DATA_UNAVAILABLE',reason:'ODDS_API_KEY_MISSING',written:0 };
    const url = new URL('https://api.the-odds-api.com/v4/sports/basketball_nba/odds');
    url.search = new URLSearchParams({ apiKey:config.oddsApiKey,regions:config.oddsRegions,markets:'h2h,spreads,totals',oddsFormat:'decimal',dateFormat:'iso' });
    const response = await fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(`The Odds API HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error('Invalid odds response');
    const source = db.prepare("SELECT id FROM data_sources WHERE code='the_odds_api'").get();
    const games = db.prepare(`SELECT g.id,g.starts_at,h.name home_team,a.name away_team FROM games g
        JOIN leagues l ON l.id=g.league_id JOIN teams h ON h.id=g.home_team_id JOIN teams a ON a.id=g.away_team_id
        WHERE l.code='nba' AND g.status='upcoming'`).all();
    let written = 0;
    for (const event of payload) {
        const start = Date.parse(event.commence_time);
        const game = games.find(row => Math.abs(Date.parse(row.starts_at)-start)<6*3600000
            && normalize(row.home_team)===normalize(event.home_team) && normalize(row.away_team)===normalize(event.away_team));
        if (!game) continue;
        for (const bookmaker of event.bookmakers || []) {
            const capturedAt = new Date(bookmaker.last_update || Date.now()).toISOString();
            if (capturedAt >= game.starts_at) continue;
            for (const market of bookmaker.markets || []) {
                const marketName = {h2h:'moneyline',spreads:'spread',totals:'total'}[market.key];
                if (!marketName) continue;
                for (const outcome of market.outcomes || []) {
                    const side = market.key === 'totals' ? String(outcome.name).toLowerCase()
                        : normalize(outcome.name)===normalize(event.home_team) ? 'home'
                        : normalize(outcome.name)===normalize(event.away_team) ? 'away' : null;
                    if (!side || !Number.isFinite(Number(outcome.price)) || Number(outcome.price)<=1) continue;
                    db.prepare(`INSERT INTO odds_snapshots(game_id,source_id,bookmaker,market,side,line,decimal_price,captured_at,raw_json)
                        VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(game_id,source_id,bookmaker,market,side,captured_at) DO NOTHING`)
                        .run(game.id,source.id,String(bookmaker.key||bookmaker.title),marketName,side,
                            Number.isFinite(Number(outcome.point))?Number(outcome.point):null,Number(outcome.price),capturedAt,JSON.stringify(outcome));
                    written++;
                }
            }
        }
    }
    return { state:'ok',events:payload.length,written,
        quota:{remaining:response.headers.get('x-requests-remaining'),used:response.headers.get('x-requests-used')} };
}

module.exports = { collectNbaOdds };

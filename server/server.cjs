'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const core = require('../sports-core.js');
const { getScores } = require('./domestic.cjs');
const { collectLeague } = require('./overseas.cjs');
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 4173);
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || 'https://sporton.live').split(',').map(s => s.trim()));
const publicFiles = new Set(['index.html', 'app.js', 'styles.css', 'sports-core.js', 'score-center.js', 'score-center.css', 'sporton-config.js', 'sw.js', 'manifest.json', 'privacy.html', 'robots.txt', 'sitemap.xml']);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml', '.txt': 'text/plain' };
const rate = new Map();
function json(res, status, value) { res.writeHead(status, { 'Content-Type': mime['.json'], 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    if (req.method === 'OPTIONS') {
        res.writeHead(origin && allowedOrigins.has(origin) ? 204 : 403, { 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'Accept' }); res.end(); return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { json(res, 405, { error: 'Method not allowed' }); return; }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/health') {
        const key = req.socket.remoteAddress, now = Date.now(), item = rate.get(key);
        const count = item && now - item.at < 60000 ? item.count + 1 : 1;
        rate.set(key, { at: item?.at && now - item.at < 60000 ? item.at : now, count });
        if (rate.size > 1000) for (const [ip,v] of rate) if (now-v.at>60000) rate.delete(ip);
        if (count>120) { json(res,429,{error:'Too many requests'});return; }
    }
    if (url.pathname === '/api/health') { json(res, 200, { status: 'ok', mode: 'poll', intervalSeconds: 10 }); return; }
    if (url.pathname === '/api/domestic') {
        if (origin && !allowedOrigins.has(origin)) { json(res, 403, { error: 'Origin not allowed' }); return; }
        const from = url.searchParams.get('from') || core.kstDate();
        const to = url.searchParams.get('to') || from;
        if (!core.validDate(from) || !core.validDate(to) || to < from || Date.parse(to) - Date.parse(from) > 7 * 86400000) { json(res, 400, { error: 'Use YYYY-MM-DD with a maximum 8-day range' }); return; }
        try { const value = await getScores(from, to); json(res, value.feeds.every(f => f.state === 'error') ? 502 : 200, value); }
        catch { json(res, 502, { error: 'Domestic source unavailable' }); }
        return;
    }
    if (url.pathname === '/api/overseas') {
        if (origin && !allowedOrigins.has(origin)) { json(res, 403, { error: 'Origin not allowed' }); return; }
        const date = url.searchParams.get('date') || core.kstDate();
        const leagueId = url.searchParams.get('league');
        if (!core.validDate(date) || !core.LEAGUES.some(l => l.id === leagueId && l.region === 'world')) { json(res, 400, { error: 'Invalid league or date' }); return; }
        const value = await collectLeague(leagueId, date);
        json(res, value.state === 'error' ? 502 : 200, value);
        return;
    }
    let file;
    try { file = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html'; } catch { json(res, 400, { error: 'Invalid path' }); return; }
    // A closed allowlist prevents exposing source, credentials, .git, or filesystem paths.
    if (!publicFiles.has(file) && !/^data\/(domestic|overseas)\/\d{4}-\d{2}-\d{2}\.json$/.test(file)) { json(res, 404, { error: 'Not found' }); return; }
    try {
        const data = await fs.readFile(path.join(ROOT, file));
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': file === 'sw.js' || file.endsWith('.json') ? 'no-cache' : 'no-cache' });
        res.end(req.method === 'HEAD' ? undefined : data);
    } catch { json(res, 404, { error: 'Not found' }); }
});
if (require.main === module) server.listen(PORT, '0.0.0.0', () => console.log('SPORTON http://localhost:' + PORT));
module.exports = server;

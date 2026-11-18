'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const server = require('../server/server.cjs');
test('HTTP routes reject bad ranges, private paths, unsupported methods and unknown origins', async t => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = 'http://127.0.0.1:' + server.address().port;
    assert.equal((await fetch(base + '/api/health')).status, 200);
    assert.equal((await fetch(base + '/api/ai/status')).status, 404);
    assert.equal((await fetch(base + '/api/ai/predictions?league=kbl&date=2026-02-30')).status, 404);
    const retired = await fetch(base + '/ai.html', {redirect:'manual'});
    assert.equal(retired.status, 302);
    assert.equal(retired.headers.get('location'), '/');
    assert.equal((await fetch(base + '/data/ai/snapshot.json')).status, 404);
    assert.equal((await fetch(base + '/ai-dashboard.js')).status, 404);
    const raw=await new Promise((resolve,reject)=>{const socket=require('node:net').connect(server.address().port,'127.0.0.1',()=>socket.write('GET http://[ HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'));let data='';socket.on('data',chunk=>data+=chunk);socket.on('end',()=>resolve(data));socket.on('error',reject);});
    assert.match(raw,/^HTTP\/1.1 400/);
    assert.equal((await fetch(base + '/api/health')).status,200,'malformed URLs cannot stop the local Node server');
    assert.equal((await fetch(base + '/api/domestic?from=2025-02-30')).status, 400);
    assert.equal((await fetch(base + '/api/domestic?from=2025-05-01&to=2025-06-01')).status, 400);
    assert.equal((await fetch(base + '/api/domestic', { headers: { Origin: 'https://example.com' } })).status, 403);
    const allowed = await fetch(base + '/api/health', { headers: { Origin: 'https://sporton.live' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://sporton.live');
    assert.equal((await fetch(base + '/.git/config')).status, 404);
    assert.equal((await fetch(base + '/server/server.cjs')).status, 404);
    assert.equal((await fetch(base + '/index.html', { method: 'POST' })).status, 405);
    assert.equal((await fetch(base + '/sports-core.js')).status, 200);
    for(const [file,type] of [['astryx-ui.js','javascript'],['astryx-ui.css','text/css'],['third-party-notices.txt','text/plain']]){const asset=await fetch(base+'/'+file);assert.equal(asset.status,200,file);assert.ok(asset.headers.get('content-type').includes(type),file);await asset.body.cancel();}
    assert.equal((await fetch(base+'/src/ui/astryx-controls.jsx')).status,404);
    assert.equal((await fetch(base + '/missing.html')).status, 404);
});

test('responses carry security headers, versioned assets are immutable and health reports the shipped release', async t => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = 'http://127.0.0.1:' + server.address().port;
    const html = require('node:fs').readFileSync('index.html', 'utf8'), release = html.match(/\?v=([\w.-]+)/)[1];
    const page = await fetch(base + '/');
    for (const header of ['x-content-type-options', 'referrer-policy', 'x-frame-options', 'strict-transport-security']) assert.ok(page.headers.get(header), header);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(page.headers.get('cache-control'), 'no-cache');
    const asset = await fetch(base + '/app.js?v=' + release);
    assert.match(asset.headers.get('cache-control'), /immutable/);
    assert.equal((await fetch(base + '/sw.js?v=' + release)).headers.get('cache-control'), 'no-cache');
    assert.equal((await (await fetch(base + '/api/health')).json()).release, release);
    assert.ok(!/firebase|font-awesome|onclick=/.test(html), 'legacy runtime dependencies stay removed');
});

test('rate-limit identity uses the trusted proxy hop only when configured', () => {
    const req = (xff, ip = '10.0.0.1') => ({ headers: xff ? { 'x-forwarded-for': xff } : {}, socket: { remoteAddress: ip } });
    assert.equal(server.clientAddress(req('203.0.113.9'), 0), '10.0.0.1', 'untrusted header is ignored by default');
    assert.equal(server.clientAddress(req('198.51.100.1, 203.0.113.9'), 1), '203.0.113.9', 'spoofed left-most entries are ignored');
    assert.equal(server.clientAddress(req('198.51.100.1, 203.0.113.9, 10.0.0.2'), 2), '203.0.113.9');
    assert.equal(server.clientAddress(req(''), 1), '10.0.0.1');
});

test('odds route validates dates, stays off without a provider key and serves its public assets', async t => {
    const previous = process.env.ODDS_API_KEY; delete process.env.ODDS_API_KEY;
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => { if (previous !== undefined) process.env.ODDS_API_KEY = previous; return new Promise(resolve => server.close(resolve)); });
    const base = 'http://127.0.0.1:' + server.address().port;
    assert.equal((await fetch(base + '/api/odds?date=2026-02-30')).status, 400);
    assert.equal((await fetch(base + '/api/odds?date=2026-11-21', { headers: { Origin: 'https://example.com' } })).status, 403);
    const off = await fetch(base + '/api/odds?date=2026-11-21');
    assert.equal(off.status, 503);
    const body = await off.json();
    assert.equal(body.state, 'unconfigured');
    assert.deepEqual(body.events, {});
    for (const file of ['odds-core.js', 'score-odds.js', 'score-odds.css']) { const r = await fetch(base + '/' + file); assert.equal(r.status, 200, file); await r.body.cancel(); }
    assert.equal((await fetch(base + '/server/odds.cjs')).status, 404);
});

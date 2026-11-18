'use strict';
// Versioned JS/CSS are served `immutable` for a year, so every content change must ship under a new ?v=.
//   node scripts/asset-release.cjs check   -> fails when assets changed but the version did not (run in tests)
//   node scripts/asset-release.cjs stamp   -> new version in index.html + sw.js, records the asset hashes
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const RECORD = path.join(__dirname, 'asset-release.json');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

function current() {
    const html = read('index.html');
    const refs = [...html.matchAll(/(?:src|href)="\/([\w.-]+\.(?:js|css))\?v=([\w.-]+)"/g)];
    const versions = [...new Set(refs.map(m => m[2]))];
    if (versions.length !== 1) throw Error('index.html must use one asset version, found: ' + versions.join(', '));
    const assets = {};
    for (const file of [...new Set(refs.map(m => m[1]))].sort()) assets[file] = createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex');
    return {version: versions[0], swVersion: read('sw.js').match(/ASSET_VERSION = '([^']+)'/)?.[1], assets};
}
function check() {
    const now = current(), recorded = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
    if (now.swVersion !== now.version) throw Error('sw.js ASSET_VERSION ' + now.swVersion + ' != index.html ' + now.version);
    const changed = Object.keys({...now.assets, ...recorded.assets}).filter(file => now.assets[file] !== recorded.assets[file]);
    if (changed.length && now.version === recorded.version) throw Error('Assets changed without a new ?v= (cached immutable for a year): ' + changed.join(', ') + '. Run: npm run release:stamp');
    if (changed.length || now.version !== recorded.version) throw Error('Asset release record is out of date. Run: npm run release:stamp');
    return {ok: true, version: now.version, assets: Object.keys(now.assets).length};
}
function stamp(label = 'r') {
    const before = current(), day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10).replaceAll('-', '');
    const same = before.version.match(new RegExp('^' + day + '-' + label + '(\\d+)$'));
    const version = day + '-' + label + (same ? Number(same[1]) + 1 : 1);
    if (!/^[\w.-]+$/.test(version)) throw Error('Invalid version label');
    fs.writeFileSync(path.join(ROOT, 'index.html'), read('index.html').replaceAll('?v=' + before.version, '?v=' + version));
    const sw = read('sw.js').replace(/ASSET_VERSION = '[^']+'/, "ASSET_VERSION = '" + version + "'").replace(/sporton-shell-v(\d+)/, (_, n) => 'sporton-shell-v' + (Number(n) + 1));
    fs.writeFileSync(path.join(ROOT, 'sw.js'), sw);
    const after = current();
    fs.writeFileSync(RECORD, JSON.stringify({version: after.version, assets: after.assets}, null, 2) + '\n');
    return {version, assets: Object.keys(after.assets).length};
}
if (require.main === module) {
    try { console.log(JSON.stringify(process.argv[2] === 'stamp' ? stamp(process.argv[3]) : check())); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {check, stamp, current};

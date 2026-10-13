// Only the installed, versioned shell is available offline. Live data is never cached here.
const CACHE_NAME = 'sporton-shell-v8';
const ASSET_VERSION = '20261013-priorities8';
const SHELL = ['/index.html', ...['styles.css','sports-core.js','app.js','score-center.js','score-center.css','sporton-config.js','watchboard.js','watchboard.css','score-alerts.js','score-diagnostics.js'].map(p => '/' + p + '?v=' + ASSET_VERSION), '/manifest.json'];
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sporton-') && k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/data/')) return;
    const navigation = event.request.mode === 'navigate' && ['/', '/index.html'].includes(url.pathname);
    const key = navigation ? '/index.html' : url.pathname + url.search;
    if (!navigation && !SHELL.includes(key)) return;
    // Keep the install snapshot coherent; do not fill this cache with arbitrary URL queries.
    event.respondWith(fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(key);
        return cached || new Response('오프라인입니다. 인터넷 연결을 확인해주세요.', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }));
});

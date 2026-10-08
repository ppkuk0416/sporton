// Static shell updates must never cache live scores or collected JSON.
const CACHE_NAME = 'sporton-shell-v2';
const SHELL = ['/', '/index.html', '/styles.css', '/sports-core.js', '/app.js', '/score-center.js', '/score-center.css', '/sporton-config.js', '/manifest.json'];
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
    self.skipWaiting();
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sporton-') && k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/data/')) return;
    if (!SHELL.includes(url.pathname)) return;
    event.respondWith(fetch(event.request).then(res => {
        if (res.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, res.clone())));
        return res;
    }).catch(async () => {
        const cached = await caches.match(event.request);
        return cached || new Response('오프라인입니다. 인터넷 연결을 확인해주세요.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
});

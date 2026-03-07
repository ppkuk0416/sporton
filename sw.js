// SPORTON Service Worker v1.0
const CACHE_NAME = 'sporton-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 설치: 정적 자원 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network-First (ESPN API), Cache-First (정적 자원)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ESPN / Odds API: 항상 네트워크 우선, 실패 시 캐시
  if (url.hostname.includes('espn.com') || url.hostname.includes('the-odds-api.com')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Firebase: 항상 네트워크 (실시간 데이터)
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('firebase')) {
    return;
  }

  // 정적 자원: Cache-First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res.ok && event.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      });
    })
  );
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'SPORTON';
  const options = {
    body: data.body || '경기가 시작되었습니다!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'sporton-notification',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: '경기 보기' },
      { action: 'close', title: '닫기' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

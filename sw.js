const CACHE_NAME = 'noorplus-v2';
const ASSETS = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/js/app.js',
    './manifest.json',
    // Local pages
    './pages/home.html',
    './pages/quran.html',
    './pages/audio-quran.html',
    './pages/prayer-time.html',
    './pages/tasbih.html',
    './pages/hadith.html',
    './pages/dua.html',
    './pages/menu.html',
    './pages/construction.html'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        })
    );
});

self.addEventListener('fetch', (e) => {
    // Network first for API/External, Cache first for assets
    if (e.request.url.includes('api.aladhan.com') || e.request.url.includes('cdn.jsdelivr.net')) {
        e.respondWith(
            fetch(e.request)
                .then((res) => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
    } else {
        e.respondWith(
            caches.match(e.request).then((res) => res || fetch(e.request))
        );
    }
});

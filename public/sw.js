// Service worker SiAbsen TPQ: membuat aplikasi cepat terbuka & bisa dipasang di layar utama.
// - Halaman utama: ambil dari internet dulu (selalu versi terbaru), cadangan dari simpanan bila offline.
// - Berkas tampilan (app.js, logo, ikon): dari simpanan dulu, diperbarui diam-diam di belakang layar.
// - Data (/api): tidak pernah disimpan.
const VERSI = '6.0';
const CACHE = 'siabsen-' + VERSI;
const ASET = ['/', '/app.js?v=' + VERSI, '/pasang.js?v=' + VERSI, '/logo-tpq.webp', '/logo-tilawati.webp',
              '/ikon-192.png', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASET)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== self.location.origin) return;
  if (u.pathname.startsWith('/api') || u.pathname.startsWith('/impor')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      const salin = r.clone(); caches.open(CACHE).then(c => c.put('/', salin)); return r;
    }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(req).then(ada => {
    const baru = fetch(req).then(r => {
      if (r.ok) { const salin = r.clone(); caches.open(CACHE).then(c => c.put(req, salin)); }
      return r;
    }).catch(() => ada);
    return ada || baru;
  }));
});

/* 交易复盘 PWA Service Worker
   策略：应用壳缓存优先，行情接口始终走网络 */
const CACHE = 'trade-journal-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);

  // 行情接口：永远走网络，失败由页面自己兜底
  if(url.hostname === 'qt.gtimg.cn') return;

  // 页面导航：网络优先，失败回退缓存（离线可用）
  if(e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request)
        .then(r=>{
          const copy = r.clone();
          caches.open(CACHE).then(c=>c.put(e.request, copy));
          return r;
        })
        .catch(()=>caches.match(e.request).then(m=>m || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(e.request).then(m=>{
      if(m) return m;
      return fetch(e.request).then(r=>{
        if(r.ok && url.origin === location.origin){
          const copy = r.clone();
          caches.open(CACHE).then(c=>c.put(e.request, copy));
        }
        return r;
      });
    })
  );
});

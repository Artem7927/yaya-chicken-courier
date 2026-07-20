/* YaYa Курьер — service worker (v1)
   Оболочка кэшируется для офлайна, но страница и данные всегда берутся из сети,
   чтобы заказы и статусы были свежими. */
const CACHE='yaya-courier-v1';
const SHELL=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;           // API/карты — не трогаем
  const core = req.mode==='navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/') || url.pathname.endsWith('/manifest.json');
  if(core){
    e.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(req,c)).catch(()=>{});return r;}).catch(()=>caches.match(req).then(h=>h||caches.match('./index.html'))));
    return;
  }
  e.respondWith(fetch(req).catch(()=>caches.match(req)));
});

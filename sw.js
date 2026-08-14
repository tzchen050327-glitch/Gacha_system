const CACHE_NAME='cp-gacha-v138-static';

self.addEventListener('install',event=>{
  self.skipWaiting()
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();

      for(const key of keys){
        if(key.startsWith('cp-gacha-')&&key!==CACHE_NAME){
          await caches.delete(key)
        }
      }
    }catch(_e){}

    await self.clients.claim()
  })())
});

self.addEventListener('fetch',event=>{
  const req=event.request;

  if(req.method!=='GET'){
    event.respondWith(fetch(req));
    return
  }

  const url=new URL(req.url);

  // Supabase / 任何跨網域請求永遠直接走網路，不使用快取
  if(url.origin!==self.location.origin){
    event.respondWith(
      fetch(req,{
        cache:'no-store'
      })
    );
    return
  }

  // HTML 頁面採 network-first
  // 避免舊版本一直卡在 Service Worker 快取
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const res=await fetch(req,{
          cache:'no-store'
        });

        if(res&&res.ok){
          const cache=await caches.open(CACHE_NAME);

          cache.put(
            req,
            res.clone()
          ).catch(()=>{})
        }

        return res
      }catch(e){
        const cached=await caches.match(req);

        if(cached){
          return cached
        }

        return new Response(
          `<!doctype html>
          <meta charset="utf-8">
          <title>離線</title>
          <body style="
            background:#081018;
            color:white;
            font-family:sans-serif;
            padding:24px
          ">
            <h2>目前無法連線</h2>
            <p>請恢復網路後重新整理。</p>
          </body>`,
          {
            headers:{
              'Content-Type':'text/html; charset=utf-8'
            }
          }
        )
      }
    })());

    return
  }

  // 同網域靜態檔採 network-first
  // 成功取得新版檔案後再更新快取
  event.respondWith((async()=>{
    try{
      const res=await fetch(req,{
        cache:'no-cache'
      });

      if(res&&res.ok){
        const cache=await caches.open(CACHE_NAME);

        cache.put(
          req,
          res.clone()
        ).catch(()=>{})
      }

      return res
    }catch(e){
      return (await caches.match(req)) || Response.error()
    }
  })())
});

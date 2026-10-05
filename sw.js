var CACHE="khushfa-measure-v29";
var FILES=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./apple-touch-icon.png"];
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
function isPage(req){
  if(req.mode==="navigate")return true;
  var u=new URL(req.url);
  return u.origin===location.origin&&(u.pathname.endsWith("/")||u.pathname.endsWith("index.html"));
}
self.addEventListener("fetch",function(e){
  var req=e.request;
  if(req.method!=="GET")return;
  if(new URL(req.url).origin!==location.origin)return;
  if(isPage(req)){
    /* page: network first (always the newest version), fall back to cache after 4 seconds or when offline */
    e.respondWith(new Promise(function(resolve){
      var done=false;
      function useCache(){caches.match("./index.html").then(function(h){if(!done&&h){done=true;resolve(h);}});}
      var timer=setTimeout(useCache,4000);
      fetch(req,{cache:"no-store"}).then(function(res){
        clearTimeout(timer);
        if(res&&res.status===200){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){c.put("./index.html",copy);});
        }
        if(!done){done=true;resolve(res);}
      }).catch(function(){clearTimeout(timer);useCache();});
    }));
    return;
  }
  /* other files (icons, manifest): cache first, refreshed in the background */
  e.respondWith(
    caches.match(req,{ignoreSearch:true}).then(function(hit){
      var net=fetch(req).then(function(res){
        if(res&&res.status===200){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){c.put(req,copy);});
        }
        return res;
      }).catch(function(){return hit;});
      return hit||net;
    })
  );
});

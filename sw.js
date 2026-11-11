/* Lexicon 오프라인 캐시 */
const CACHE = "lexicon-v3";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  // 교재 단어 파일(.txt)은 캐시하지 않고 그냥 지나보냅니다.
  // 캐시 우선으로 잡아 두면 파일을 고쳐 올려도 앱이 옛 내용을 계속 읽습니다.
  // 앱이 켜져 있을 때만 쓰는 파일이라 오프라인에 둘 이유도 없습니다.
  if (url.pathname.endsWith(".txt")) return;

  const isDoc = e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");

  if (isDoc) {
    // 앱 본체는 네트워크 우선 — 업데이트가 바로 반영되고, 오프라인이면 캐시로 넘어갑니다
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // 아이콘 등 변하지 않는 파일은 캐시 우선
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
    )
  );
});

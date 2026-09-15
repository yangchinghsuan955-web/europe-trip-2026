/* Aurora Trip offline package service worker. */
"use strict";

const OFFLINE_CACHE = "aurora-trip-offline-v3";
const LEGACY_CACHES = ["aurora-trip-offline-v2", "aurora-trip-offline-v1"];
const META_URL = new URL("__offline_meta__", self.registration.scope).href;
const VERSION = "20260915-offline3";
const ROOT = new URL("./", self.registration.scope);
const CONCURRENCY = 5;

const SEEDS = [
  "",
  "daily/",
  "transport/",
  "stay/",
  "budget/",
  "prep-tools/",
  "prep-tools/entry.html",
  "prep-tools/booking.html",
  "prep-tools/checklist.html",
  "prep-tools/tax.html",
  "prep-tools/apps.html",
  "prep-tools/apps/",
  "prep-tools/apps/transport/",
  "prep-tools/apps/aurora/",
  "prep-tools/apps/tax/",
  "prep-tools/apps/tools/",
  "install.html",
  "manifest.webmanifest",
  "assets/common.css",
  "assets/common.js",
  "assets/data/core.js",
  "assets/offline-manager.js"
];

const ASSET_EXT_RE = /\.(?:html?|js|css|json|webmanifest|png|jpe?g|webp|avif|svg)(?:[?#].*)?$/i;
const TEXT_TYPE_RE = /(?:text\/|javascript|json|xml|css|manifest)/i;
const SHOPPING_RASTER_RE = /\.(?:png|jpe?g|webp|avif)$/i;

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

function sameScope(url) {
  return url.origin === ROOT.origin && url.pathname.startsWith(ROOT.pathname);
}

function canonical(urlLike) {
  const url = new URL(urlLike, ROOT);
  url.hash = "";
  return url;
}

function isHighResAsset(urlLike) {
  try {
    const url = canonical(urlLike);
    const pathname = url.pathname;
    if (!SHOPPING_RASTER_RE.test(pathname)) return false;
    if (/\/assets\/shopping\/optimized\/thumbs\//i.test(pathname)) return false;
    if (/\/assets\/shopping\/[^/]+\/thumbs\//i.test(pathname)) return false;
    return /\/assets\/shopping\/(?:amsterdam|norway|vienna|finland)\//i.test(pathname);
  } catch (_) {
    return false;
  }
}

async function readMeta(cache) {
  const response = await cache.match(META_URL);
  if (!response) return null;
  try { return await response.json(); } catch (_) { return null; }
}

async function writeMeta(cache, meta) {
  await cache.put(META_URL, new Response(JSON.stringify(meta), {
    headers: { "content-type": "application/json; charset=utf-8" }
  }));
}

async function readyCacheInfo() {
  const names = [OFFLINE_CACHE].concat(LEGACY_CACHES);
  for (const name of names) {
    if (!(await caches.has(name))) continue;
    const cache = await caches.open(name);
    const meta = await readMeta(cache);
    if (meta && meta.ready) return { name, cache, meta };
  }
  return null;
}

async function getStatus() {
  const info = await readyCacheInfo();
  const meta = info && info.meta;
  return {
    ready: Boolean(meta && meta.ready),
    version: meta && meta.version || null,
    downloadedAt: meta && meta.downloadedAt || null,
    count: meta && meta.count || 0,
    failed: meta && meta.failed || 0,
    bytes: meta && meta.bytes || 0,
    highRes: Boolean(meta && meta.highRes),
    outdated: Boolean(meta && meta.version !== VERSION)
  };
}

function addCandidate(target, raw, base, includeHighRes) {
  if (!raw || /^(?:data:|blob:|mailto:|tel:|javascript:|#)/i.test(raw)) return;
  try {
    const url = canonical(new URL(raw, base));
    if (!sameScope(url)) return;
    if (!includeHighRes && isHighResAsset(url)) return;
    if (!ASSET_EXT_RE.test(url.pathname + url.search) && !url.pathname.endsWith("/")) return;
    target.add(url.href);
  } catch (_) {}
}

function addJavaScriptCandidate(target, raw, base, includeHighRes) {
  if (/^(?:\.\.\/)+assets\//i.test(raw)) {
    addCandidate(target, raw.replace(/^(?:\.\.\/)+/i, ""), ROOT, includeHighRes);
    return;
  }
  if (/^assets\//i.test(raw)) {
    addCandidate(target, raw, ROOT, includeHighRes);
    return;
  }
  addCandidate(target, raw, base, includeHighRes);
}

function discoverUrls(text, responseUrl, includeHighRes) {
  const found = new Set();
  const base = canonical(responseUrl);
  const isJavaScript = /\.js$/i.test(base.pathname);
  let match;

  const attrRe = /(?:src|href)\s*=\s*["']([^"'#]+)["']/gi;
  while ((match = attrRe.exec(text))) addCandidate(found, match[1], base, includeHighRes);

  const cssRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((match = cssRe.exec(text))) addCandidate(found, match[1], base, includeHighRes);

  const quotedAssetRe = /["'`]([^"'`\n\r]{1,320}\.(?:html?|js|css|json|webmanifest|png|jpe?g|webp|avif|svg)(?:\?[^"'`\s]*)?)["'`]/gi;
  while ((match = quotedAssetRe.exec(text))) {
    if (isJavaScript) addJavaScriptCandidate(found, match[1], base, includeHighRes);
    else addCandidate(found, match[1], base, includeHighRes);
  }

  if (/\/assets\/modules\/shopping\/finland-shopping-data\.js$/i.test(base.pathname)) {
    const filenameRe = /["']([^"'\n\r]+\.(?:png|jpe?g|webp|avif))["']/gi;
    while ((match = filenameRe.exec(text))) {
      const filename = match[1];
      if (filename.includes("/") || filename.includes("?")) continue;
      addCandidate(found, "assets/shopping/finland/thumbs/" + filename, ROOT, includeHighRes);
      if (includeHighRes) addCandidate(found, "assets/shopping/finland/large/" + filename, ROOT, true);
    }
  }

  if (/\/assets\/vienna-shopping-assets\.js$/i.test(base.pathname)) {
    const filenameRe = /["']([^"'\n\r]+\.(?:png|jpe?g|webp|avif))["']/gi;
    while ((match = filenameRe.exec(text))) {
      const filename = match[1];
      if (filename.includes("/") || filename.includes("?")) continue;
      addCandidate(found, "assets/shopping/vienna/thumbs/" + filename, ROOT, includeHighRes);
      if (includeHighRes) addCandidate(found, "assets/shopping/vienna/large/" + filename, ROOT, true);
    }
  }

  return [...found];
}

async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  clients.forEach(client => client.postMessage(message));
}

async function responseBytes(response) {
  const header = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(header) && header > 0) return header;
  try {
    const blob = await response.clone().blob();
    return blob.size || 0;
  } catch (_) {
    return 0;
  }
}

async function fetchAndCache(cache, href) {
  const request = new Request(href, { credentials: "same-origin", cache: "reload" });
  const response = await fetch(request);
  if (!response.ok) {
    const error = new Error("HTTP " + response.status + " " + href);
    error.httpStatus = response.status;
    throw error;
  }
  const bytes = await responseBytes(response);
  try {
    await cache.put(request, response.clone());
  } catch (error) {
    error.cacheWriteFailed = true;
    throw error;
  }
  return { response, bytes };
}

async function verifyCritical(cache) {
  const critical = ["daily/", "transport/", "stay/", "prep-tools/", "budget/", "assets/common.css", "assets/data/core.js"];
  for (const path of critical) {
    const request = new Request(new URL(path, ROOT).href);
    const match = await cache.match(request, { ignoreSearch: true });
    if (!match) throw new Error("Missing critical offline asset: " + path);
  }
}

async function pruneHighRes(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.map(request => {
    return isHighResAsset(request.url) ? cache.delete(request) : Promise.resolve(false);
  }));
}

async function downloadOfflinePack(options) {
  const includeHighRes = Boolean(options && options.includeHighRes);
  const cache = await caches.open(OFFLINE_CACHE);
  const queue = SEEDS.map(path => new URL(path, ROOT).href);
  const seedSet = new Set(queue);
  const queued = new Set(queue);
  const visited = new Set();
  let completed = 0;
  let processed = 0;
  let failed = 0;
  let bytes = 0;

  await broadcast({ type: "OFFLINE_PROGRESS", phase: "start", processed: 0, completed: 0, total: queued.size, bytes: 0, includeHighRes });

  while (queue.length) {
    const batch = [];
    while (queue.length && batch.length < CONCURRENCY) {
      const href = queue.shift();
      if (visited.has(href)) continue;
      visited.add(href);
      batch.push(href);
    }
    if (!batch.length) continue;

    let fatalError = null;
    await Promise.all(batch.map(async href => {
      try {
        const result = await fetchAndCache(cache, href);
        completed += 1;
        bytes += result.bytes || 0;
        const response = result.response;
        const contentType = response.headers.get("content-type") || "";
        const pathname = new URL(href).pathname;
        if (/\.(?:html?|js|css|json|webmanifest)$/i.test(pathname) || TEXT_TYPE_RE.test(contentType)) {
          let text = "";
          try { text = await response.clone().text(); } catch (_) {}
          if (text) {
            discoverUrls(text, href, includeHighRes).forEach(nextHref => {
              if (!queued.has(nextHref) && !visited.has(nextHref)) {
                queued.add(nextHref);
                queue.push(nextHref);
              }
            });
          }
        }
      } catch (error) {
        if (error && (error.cacheWriteFailed || !error.httpStatus)) fatalError = fatalError || error;
        else if (seedSet.has(href)) failed += 1;
      } finally {
        processed += 1;
      }
    }));

    await broadcast({ type: "OFFLINE_PROGRESS", phase: "download", processed, completed, failed, total: queued.size, bytes, includeHighRes });
    if (fatalError) throw fatalError;
  }

  await verifyCritical(cache);
  if (!includeHighRes) await pruneHighRes(cache);

  const meta = {
    ready: true,
    version: VERSION,
    downloadedAt: new Date().toISOString(),
    count: completed,
    failed,
    bytes,
    highRes: includeHighRes
  };
  await writeMeta(cache, meta);

  await Promise.all(LEGACY_CACHES.map(name => caches.delete(name)));
  await broadcast({ type: "OFFLINE_PROGRESS", phase: "done", ...meta });
  return meta;
}

async function clearOfflinePack() {
  await Promise.all([OFFLINE_CACHE].concat(LEGACY_CACHES).map(name => caches.delete(name)));
  return { ready: false, version: null, downloadedAt: null, count: 0, failed: 0, bytes: 0, highRes: false, outdated: false };
}

self.addEventListener("message", event => {
  const data = event.data || {};
  const reply = payload => {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(payload);
  };

  if (data.type === "OFFLINE_STATUS") {
    event.waitUntil(getStatus().then(status => reply({ ok: true, status })).catch(error => reply({ ok: false, error: error.message })));
    return;
  }

  if (data.type === "DOWNLOAD_OFFLINE") {
    event.waitUntil(downloadOfflinePack({ includeHighRes: Boolean(data.includeHighRes) })
      .then(status => reply({ ok: true, status }))
      .catch(error => reply({ ok: false, error: error.message })));
    return;
  }

  if (data.type === "CLEAR_OFFLINE") {
    event.waitUntil(clearOfflinePack()
      .then(status => reply({ ok: true, status }))
      .catch(error => reply({ ok: false, error: error.message })));
  }
});

/* Online browsing stays network-native; Cache Storage is touched only after a network failure. */
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!sameScope(url)) return;

  const networkRequest = request.mode === "navigate" && event.preloadResponse
    ? event.preloadResponse.then(response => response || fetch(request))
    : fetch(request);

  event.respondWith(networkRequest.catch(async error => {
    const info = await readyCacheInfo();
    if (!info) throw error;
    const cached = await info.cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const fallback = await info.cache.match(new Request(new URL("daily/", ROOT).href), { ignoreSearch: true });
      if (fallback) return fallback;
    }
    throw error;
  }));
});

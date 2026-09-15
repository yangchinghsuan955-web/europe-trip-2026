/* Aurora Trip offline package service worker. */
"use strict";

const OFFLINE_CACHE = "aurora-trip-offline-v1";
const META_URL = new URL("__offline_meta__", self.registration.scope).href;
const VERSION = "20260915-offline1";
const ROOT = new URL("./", self.registration.scope);

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

const DOCUMENT_BASES = [
  "",
  "daily/",
  "transport/",
  "stay/",
  "budget/",
  "prep-tools/",
  "prep-tools/apps/",
  "prep-tools/apps/transport/",
  "prep-tools/apps/aurora/",
  "prep-tools/apps/tax/",
  "prep-tools/apps/tools/"
].map(path => new URL(path, ROOT));

const ASSET_EXT_RE = /\.(?:html?|js|css|json|webmanifest|png|jpe?g|webp|avif|svg)(?:[?#].*)?$/i;
const TEXT_TYPE_RE = /(?:text\/|javascript|json|xml|css|manifest)/i;

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

function sameScope(url) {
  return url.origin === ROOT.origin && url.pathname.startsWith(ROOT.pathname);
}

function canonical(urlLike) {
  const url = new URL(urlLike, ROOT);
  url.hash = "";
  return url;
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

async function getStatus() {
  const cache = await caches.open(OFFLINE_CACHE);
  const meta = await readMeta(cache);
  return {
    ready: Boolean(meta && meta.ready),
    version: meta && meta.version || null,
    downloadedAt: meta && meta.downloadedAt || null,
    count: meta && meta.count || 0,
    failed: meta && meta.failed || 0
  };
}

function addCandidate(target, raw, base) {
  if (!raw || /^(?:data:|blob:|mailto:|tel:|javascript:|#)/i.test(raw)) return;
  try {
    const url = canonical(new URL(raw, base));
    if (!sameScope(url)) return;
    if (!ASSET_EXT_RE.test(url.pathname + url.search) && !url.pathname.endsWith("/")) return;
    target.add(url.href);
  } catch (_) {}
}

function discoverUrls(text, responseUrl) {
  const found = new Set();
  const base = canonical(responseUrl);
  const raws = new Set();
  let match;

  const attrRe = /(?:src|href)\s*=\s*["']([^"'#]+)["']/gi;
  while ((match = attrRe.exec(text))) raws.add(match[1]);

  const cssRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((match = cssRe.exec(text))) raws.add(match[1]);

  const quotedAssetRe = /["'`]([^"'`\n\r]{1,320}\.(?:html?|js|css|json|webmanifest|png|jpe?g|webp|avif|svg)(?:\?[^"'`\s]*)?)["'`]/gi;
  while ((match = quotedAssetRe.exec(text))) raws.add(match[1]);

  const isJavaScript = /\.js$/i.test(base.pathname);
  raws.forEach(raw => {
    addCandidate(found, raw, base);
    if (isJavaScript && !/^(?:https?:)?\/\//i.test(raw) && !raw.startsWith("/")) {
      DOCUMENT_BASES.forEach(docBase => addCandidate(found, raw, docBase));
    }
  });

  // Finland shopping image filenames are combined dynamically at runtime.
  if (/\/assets\/modules\/shopping\/finland-shopping-data\.js$/i.test(base.pathname)) {
    const filenameRe = /["']([^"'\n\r]+\.(?:png|jpe?g|webp|avif))["']/gi;
    while ((match = filenameRe.exec(text))) {
      const filename = match[1];
      if (filename.includes("/") || filename.includes("?")) continue;
      addCandidate(found, "assets/shopping/finland/thumbs/" + filename, ROOT);
      addCandidate(found, "assets/shopping/finland/large/" + filename, ROOT);
    }
  }

  return [...found];
}

async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  clients.forEach(client => client.postMessage(message));
}

async function fetchAndCache(cache, href) {
  const request = new Request(href, { credentials: "same-origin", cache: "reload" });
  const response = await fetch(request);
  if (!response.ok) throw new Error("HTTP " + response.status + " " + href);
  await cache.put(request, response.clone());
  return response;
}

async function verifyCritical(cache) {
  const critical = ["daily/", "transport/", "stay/", "prep-tools/", "budget/", "assets/common.css", "assets/data/core.js"];
  for (const path of critical) {
    const request = new Request(new URL(path, ROOT).href);
    const match = await cache.match(request, { ignoreSearch: true });
    if (!match) throw new Error("Missing critical offline asset: " + path);
  }
}

async function downloadOfflinePack() {
  const cache = await caches.open(OFFLINE_CACHE);
  await cache.delete(META_URL);

  const queue = SEEDS.map(path => new URL(path, ROOT).href);
  const seedSet = new Set(queue);
  const queued = new Set(queue);
  const visited = new Set();
  let completed = 0;
  let failed = 0;

  await broadcast({ type: "OFFLINE_PROGRESS", phase: "start", completed: 0, total: queue.length });

  while (queue.length) {
    const href = queue.shift();
    if (visited.has(href)) continue;
    visited.add(href);

    try {
      const response = await fetchAndCache(cache, href);
      completed += 1;
      const contentType = response.headers.get("content-type") || "";
      const pathname = new URL(href).pathname;
      if (/\.(?:html?|js|css|json|webmanifest)$/i.test(pathname) || TEXT_TYPE_RE.test(contentType)) {
        let text = "";
        try { text = await response.clone().text(); } catch (_) {}
        if (text) {
          discoverUrls(text, href).forEach(nextHref => {
            if (!queued.has(nextHref) && !visited.has(nextHref)) {
              queued.add(nextHref);
              queue.push(nextHref);
            }
          });
        }
      }
    } catch (_) {
      if (seedSet.has(href)) failed += 1;
    }

    if ((visited.size % 5 === 0) || queue.length === 0) {
      await broadcast({
        type: "OFFLINE_PROGRESS",
        phase: "download",
        completed,
        failed,
        total: visited.size + queue.length
      });
    }
  }

  await verifyCritical(cache);
  const meta = {
    ready: true,
    version: VERSION,
    downloadedAt: new Date().toISOString(),
    count: completed,
    failed
  };
  await writeMeta(cache, meta);
  await broadcast({ type: "OFFLINE_PROGRESS", phase: "done", ...meta });
  return meta;
}

async function clearOfflinePack() {
  await caches.delete(OFFLINE_CACHE);
  return { ready: false, version: null, downloadedAt: null, count: 0, failed: 0 };
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
    event.waitUntil(downloadOfflinePack()
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

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!sameScope(url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(OFFLINE_CACHE);
    const meta = await readMeta(cache);
    if (!meta || !meta.ready) return fetch(request);

    try {
      const response = await fetch(request);
      if (response && response.ok) {
        try { await cache.put(request, response.clone()); } catch (_) {}
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      if (request.mode === "navigate") {
        const fallback = await cache.match(new Request(new URL("daily/", ROOT).href), { ignoreSearch: true });
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});

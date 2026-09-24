import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

function source(relativePath) {
  return readFileSync(new URL(relativePath, new URL("../", import.meta.url)), "utf8");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

test("shared packing renderer changes the badge to 已裝 when an item is checked", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(source("assets/modules/common-runtime-tools.js"), context, {
    filename: "assets/modules/common-runtime-tools.js"
  });

  const elements = {
    "#checklist": { innerHTML: "" },
    "#checkPercent": { textContent: "" },
    "#checkCount": { textContent: "" },
    "#progressFill": { style: { width: "" } }
  };
  const state = { checks: { "pack-0-0": true } };
  const runtime = context.window.TravelCommonRuntimeTools.setup({
    $: selector => elements[selector],
    $$: () => [],
    APP_DATA: { prep: [], bookings: [], tax: [], budgets: [], budgetSummary: {}, food: [] },
    PACKING_GROUPS: [{ group: "證件", items: [{ item: "護照" }, { item: "身分證" }] }],
    PRINT_GROUPS: [],
    state,
    save: () => {},
    escapeHtml,
    fmtTwd: String,
    dateLabel: String,
    statusClass: () => "neutral"
  });

  runtime.renderChecklist();
  assert.match(elements["#checklist"].innerHTML, /護照[\s\S]*?status confirmed">已裝<\/span>/);
  assert.match(elements["#checklist"].innerHTML, /身分證[\s\S]*?status neutral">未裝<\/span>/);
});

test("custom 107-item packing renderer changes the badge to 已裝 when an item is checked", () => {
  const html = source("prep-tools/checklist.html");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  const packingScript = scripts.find(script => script.includes("const PACKING_V2"));
  assert.ok(packingScript, "custom packing script should exist");

  const checklist = { innerHTML: "", querySelectorAll: () => [] };
  const elements = {
    packingWarnings: { innerHTML: "" },
    checklist,
    checkPercent: { textContent: "" },
    checkCount: { textContent: "" },
    progressFill: { style: { width: "" } },
    "tab-luggage": { classList: { add: () => {} } },
    luggageSegments: { style: { setProperty: () => {} } },
    resetChecks: { addEventListener: () => {} }
  };
  let savedChecks = JSON.stringify({ "pack2-0-0": true });
  const context = vm.createContext({
    document: {
      getElementById: id => elements[id] ?? null,
      querySelector: selector => selector === "#tab-luggage .subview"
        ? { style: { setProperty: () => {} } }
        : null,
      addEventListener: () => {}
    },
    localStorage: {
      getItem: () => savedChecks,
      setItem: (_key, value) => { savedChecks = value; }
    },
    window: { addEventListener: () => {} },
    setTimeout: callback => { callback(); return 0; }
  });

  vm.runInContext(packingScript, context, { filename: "prep-tools/checklist.html:inline-packing" });
  assert.match(checklist.innerHTML, /護照[\s\S]*?status confirmed">已裝<\/span>/);
  assert.match(checklist.innerHTML, /身分證[\s\S]*?status neutral">未裝<\/span>/);
});

class MemoryCache {
  constructor() {
    this.entries = new Map();
  }

  async put(request, response) {
    this.entries.set(requestUrl(request), response.clone());
  }

  async match(request, options = {}) {
    const requested = requestUrl(request);
    if (!options.ignoreSearch) return this.entries.get(requested)?.clone();
    const target = new URL(requested);
    for (const [url, response] of this.entries) {
      const candidate = new URL(url);
      if (candidate.origin === target.origin && candidate.pathname === target.pathname) return response.clone();
    }
    return undefined;
  }

  async keys() {
    return [...this.entries.keys()].map(url => new Request(url));
  }

  async delete(request) {
    return this.entries.delete(requestUrl(request));
  }
}

function requestUrl(request) {
  return typeof request === "string" ? request : request.url;
}

function createCacheStorage() {
  const stores = new Map();
  return {
    stores,
    async has(name) { return stores.has(name); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new MemoryCache());
      return stores.get(name);
    },
    async delete(name) { return stores.delete(name); }
  };
}

function relativePath(url, scope) {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.slice(new URL(scope).pathname.length));
}

function makeResponse(path, scope, extraMarkup = "") {
  if (/\.(?:png|jpe?g|webp|avif|svg)$/i.test(path)) {
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "image/png", "content-length": "3" }
    });
  }

  const rootMarkup = path === ""
    ? '<img src="assets/app-icons/三餐自理圖V2.png">' + extraMarkup
    : "";
  const contentType = path.endsWith(".js") ? "application/javascript" : "text/html; charset=utf-8";
  return new Response(rootMarkup, {
    status: 200,
    headers: { "content-type": contentType, "content-length": String(Buffer.byteLength(rootMarkup)) }
  });
}

function serviceWorkerHarness(fetchImplementation) {
  const scope = "https://example.test/europe-trip-2026/";
  const caches = createCacheStorage();
  const listeners = {};
  const worker = {
    registration: {
      scope,
      navigationPreload: { enable: async () => {} }
    },
    clients: {
      claim: async () => {},
      matchAll: async () => []
    },
    skipWaiting: async () => {},
    addEventListener: (type, callback) => { listeners[type] = callback; }
  };
  const context = vm.createContext({
    self: worker,
    caches,
    fetch: request => fetchImplementation(request, scope),
    Response,
    Request,
    URL,
    Set,
    Promise,
    Date,
    Error,
    TypeError,
    RegExp,
    Array,
    Object,
    String,
    Number,
    Boolean,
    JSON,
    console,
    setTimeout: callback => { callback(); return 0; },
    clearTimeout: () => {}
  });
  vm.runInContext(source("service-worker.js"), context, { filename: "service-worker.js" });
  return {
    context,
    scope,
    caches,
    download: options => vm.runInContext(
      `downloadOfflinePack(${JSON.stringify(options ?? {})})`,
      context
    )
  };
}

test("offline downloader retries a transient optional-resource Load failed error", async () => {
  const attempts = new Map();
  const harness = serviceWorkerHarness(async (request, scope) => {
    const path = relativePath(requestUrl(request), scope);
    attempts.set(path, (attempts.get(path) ?? 0) + 1);
    if (path === "assets/transient.png" && attempts.get(path) === 1) {
      throw new TypeError("Load failed");
    }
    return makeResponse(path, scope, path === "" ? '<img src="assets/transient.png">' : "");
  });

  const result = await harness.download({ includeHighRes: false });
  assert.equal(result.ready, true);
  assert.equal(result.failed, 0);
  assert.equal(attempts.get("assets/transient.png"), 2);
});

test("offline downloader skips a permanently failing optional asset after retries", async () => {
  const attempts = new Map();
  const harness = serviceWorkerHarness(async (request, scope) => {
    const path = relativePath(requestUrl(request), scope);
    attempts.set(path, (attempts.get(path) ?? 0) + 1);
    if (path === "assets/optional.png") throw new TypeError("Load failed");
    return makeResponse(path, scope, path === "" ? '<img src="assets/optional.png">' : "");
  });

  const result = await harness.download({ includeHighRes: false });
  assert.equal(result.ready, true);
  assert.equal(result.failed, 1);
  assert.equal(attempts.get("assets/optional.png"), 3);
});

test("offline downloader reports the failing path for a required resource", async () => {
  const harness = serviceWorkerHarness(async (request, scope) => {
    const path = relativePath(requestUrl(request), scope);
    if (path === "daily/") throw new TypeError("Load failed");
    return makeResponse(path, scope);
  });

  await assert.rejects(
    harness.download({ includeHighRes: false }),
    /daily\//
  );
});

test("offline downloader limits concurrent mobile cache writes", () => {
  const harness = serviceWorkerHarness(async (request, scope) => {
    return makeResponse(relativePath(requestUrl(request), scope), scope);
  });
  assert.equal(vm.runInContext("CONCURRENCY", harness.context), 2);
});

test("every page-specific loader requests the same v5 offline manager", () => {
  const loaders = [
    "assets/common.js",
    "assets/modules/daily.js",
    "assets/modules/shopping/recommendations.js"
  ];
  loaders.forEach(path => {
    const contents = source(path);
    assert.match(contents, /offline-manager\.js\?v=20260924-offline5/, path);
    assert.doesNotMatch(contents, /offline-manager\.js\?v=202609(?:15-offline3|22-offline4)/, path);
  });
});

test("HTML entry points cache-bust the updated loader scripts", () => {
  assert.match(source("daily/index.html"), /common-runtime-tools\.js\?v=20260924-checkstatus1/);
  assert.match(source("daily/index.html"), /daily\.js\?v=20260924-offline5/);
  assert.match(source("budget/index.html"), /recommendations\.js\?v=20260924-offline5/);

  [
    "transport/index.html",
    "stay/index.html",
    "prep-tools/index.html",
    "prep-tools/entry.html",
    "prep-tools/booking.html",
    "prep-tools/checklist.html",
    "prep-tools/tax.html",
    "prep-tools/apps/index.html"
  ].forEach(path => {
    assert.match(source(path), /common\.js\?v=20260924-offline5/, path);
  });
});

test("the complete current repository builds a high-resolution offline package", async () => {
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".avif": "image/avif"
  };
  const attempts = new Map();
  const harness = serviceWorkerHarness(async (request, scope) => {
    const url = new URL(requestUrl(request));
    let path = relativePath(url.href, scope);
    if (!path || path.endsWith("/")) path += "index.html";
    attempts.set(path, (attempts.get(path) ?? 0) + 1);

    const fileUrl = new URL(path, new URL("../", import.meta.url));
    const filePath = fileURLToPath(fileUrl);
    if (!filePath.startsWith(repositoryRoot) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
    }

    const body = readFileSync(filePath);
    const extension = path.match(/\.[^.\/]+$/)?.[0]?.toLowerCase() ?? "";
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentTypes[extension] ?? "application/octet-stream",
        "content-length": String(body.byteLength)
      }
    });
  });

  const result = await harness.download({ includeHighRes: true });
  assert.equal(result.ready, true);
  assert.equal(result.highRes, true);
  assert.equal(result.failed, 0, `full repository package skipped ${result.failed} resources`);
  assert.ok(result.count > 100, `expected a full package, received ${result.count} resources`);

  const cache = harness.caches.stores.get("aurora-trip-offline-v5");
  assert.ok(cache, "v5 cache should be created");
  for (const path of [
    "daily/",
    "prep-tools/checklist.html",
    "assets/data/core.js",
    "assets/app-icons/三餐自理圖V2.png"
  ]) {
    const cached = await cache.match(new Request(new URL(path, harness.scope).href), { ignoreSearch: true });
    assert.ok(cached, `${path} should be present in the completed package`);
  }
});

void repositoryRoot;

/* Manual offline package controls for the Aurora Trip web app. */
(function () {
  "use strict";

  if (!("serviceWorker" in navigator) || !("caches" in window)) return;

  var current = document.currentScript;
  var scriptUrl = current && current.src ? new URL(current.src) : new URL("assets/offline-manager.js", document.baseURI);
  var rootUrl = new URL("../", scriptUrl);
  var swUrl = new URL("service-worker.js?v=20260915-offline2", rootUrl);
  var badge = document.getElementById("networkBadge");
  var state = {
    ready: false,
    busy: false,
    downloadedAt: null,
    count: 0,
    failed: 0,
    bytes: 0,
    highRes: false,
    outdated: false
  };
  var panel;
  var statusLine;
  var detailLine;
  var primaryButton;
  var clearButton;
  var highResInput;

  function style() {
    if (document.getElementById("offlineManagerStyle")) return;
    var css = document.createElement("style");
    css.id = "offlineManagerStyle";
    css.textContent = [
      "#networkBadge[data-offline-control]{cursor:pointer;user-select:none}",
      ".offline-manager-backdrop{position:fixed;inset:0;z-index:140;background:rgba(5,20,28,.62);display:grid;place-items:end center;padding:18px}",
      ".offline-manager-backdrop[hidden]{display:none}",
      ".offline-manager-card{width:min(100%,520px);background:#fff;border:1px solid rgba(193,211,207,.9);border-radius:22px;padding:18px;box-shadow:0 24px 70px rgba(16,45,62,.28);color:#102d3e}",
      ".offline-manager-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}",
      ".offline-manager-head h2{font-size:18px;margin:0 0 5px}.offline-manager-head p{margin:0;color:#6f8188;font-size:13px;line-height:1.5}",
      ".offline-manager-close{border:0;background:#eef4f3;width:38px;height:38px;border-radius:50%;font-size:22px;color:#102d3e;cursor:pointer}",
      ".offline-manager-status{margin:16px 0 8px;padding:13px 14px;border-radius:15px;background:#edf5fa;font-weight:800}",
      ".offline-manager-detail{margin:0 0 12px;color:#6f8188;font-size:12px;line-height:1.55}",
      ".offline-manager-option{display:flex;gap:10px;align-items:flex-start;margin:0 0 16px;padding:11px 12px;border:1px solid #dce7e4;border-radius:14px;background:#f7faf9;color:#405860;font-size:12px;line-height:1.5}",
      ".offline-manager-option input{width:18px;height:18px;margin:1px 0 0;flex:0 0 auto;accent-color:#102d3e}",
      ".offline-manager-option b{display:block;color:#102d3e;font-size:13px}",
      ".offline-manager-actions{display:grid;grid-template-columns:1fr auto;gap:9px}",
      ".offline-manager-btn{min-height:44px;border:0;border-radius:13px;padding:9px 14px;font-weight:800;cursor:pointer}",
      ".offline-manager-btn.primary{background:#102d3e;color:#fff}.offline-manager-btn.secondary{background:#f3f5f4;color:#53676f;border:1px solid #d7e2df}",
      ".offline-manager-btn:disabled{opacity:.52;cursor:wait}",
      ".offline-manager-note{margin:13px 1px 0;color:#6f8188;font-size:11px;line-height:1.55}",
      "@media(min-width:700px){.offline-manager-backdrop{place-items:center}}"
    ].join("");
    document.head.appendChild(css);
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat("zh-TW", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    } catch (_) { return ""; }
  }

  function formatBytes(value) {
    var bytes = Number(value || 0);
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(bytes < 1024 * 100 ? 1 : 0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0) + " MB";
  }

  function ensurePanel() {
    if (panel) return panel;
    style();
    panel = document.createElement("div");
    panel.className = "offline-manager-backdrop";
    panel.hidden = true;
    panel.innerHTML = '<section class="offline-manager-card" role="dialog" aria-modal="true" aria-labelledby="offlineManagerTitle">' +
      '<div class="offline-manager-head"><div><h2 id="offlineManagerTitle">📥 離線旅行資料</h2><p>基本包保存五個主頁籤、本機旅行資料與必要圖片；商品高清原圖改為選配。</p></div><button class="offline-manager-close" type="button" aria-label="關閉">×</button></div>' +
      '<div class="offline-manager-status" id="offlineManagerStatus">正在檢查…</div>' +
      '<p class="offline-manager-detail" id="offlineManagerDetail"></p>' +
      '<label class="offline-manager-option"><input id="offlineManagerHighRes" type="checkbox"><span><b>同時下載商品高清圖片</b>選配；離線時可放大查看商品原圖，但會增加手機容量與下載時間。</span></label>' +
      '<div class="offline-manager-actions"><button class="offline-manager-btn primary" id="offlineManagerPrimary" type="button">下載基本離線資料</button><button class="offline-manager-btn secondary" id="offlineManagerClear" type="button">清除</button></div>' +
      '<p class="offline-manager-note">Google Maps／My Maps、即時天氣、極光預報、航空公司與購票網站仍需要網路。下載只保存本站內容，不會快取外部網站。</p>' +
      '</section>';
    document.body.appendChild(panel);
    statusLine = panel.querySelector("#offlineManagerStatus");
    detailLine = panel.querySelector("#offlineManagerDetail");
    primaryButton = panel.querySelector("#offlineManagerPrimary");
    clearButton = panel.querySelector("#offlineManagerClear");
    highResInput = panel.querySelector("#offlineManagerHighRes");
    panel.querySelector(".offline-manager-close").addEventListener("click", closePanel);
    panel.addEventListener("click", function (event) { if (event.target === panel) closePanel(); });
    primaryButton.addEventListener("click", download);
    clearButton.addEventListener("click", clear);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) closePanel();
    });
    return panel;
  }

  function openPanel() {
    ensurePanel().hidden = false;
    render();
  }

  function closePanel() {
    if (panel) panel.hidden = true;
  }

  function renderBadge() {
    if (!badge) return;
    badge.dataset.offlineControl = "1";
    badge.setAttribute("role", "button");
    badge.setAttribute("tabindex", "0");
    badge.setAttribute("aria-label", state.ready ? "離線資料已準備，點擊管理" : "下載離線旅行資料");
    var label = badge.querySelector("span");
    if (!label) return;
    if (!navigator.onLine) label.textContent = state.ready ? "✅ 離線已準備" : "目前離線";
    else if (state.busy) label.textContent = "⬇️ 下載中…";
    else if (state.ready && state.outdated) label.textContent = "⬆️ 離線可更新";
    else label.textContent = state.ready ? "✅ 離線已準備" : "⬇️ 下載離線";
  }

  function render() {
    renderBadge();
    if (!panel) return;

    if (state.busy) {
      statusLine.textContent = "⬇️ 正在下載離線旅行資料…";
      detailLine.textContent = state.progress || "請保持此頁開啟；新版會同時下載最多 5 個資源以縮短等待時間。";
    } else if (state.ready) {
      statusLine.textContent = state.outdated ? "⬆️ 離線資料有新版可更新" : "✅ 離線旅行資料已準備";
      var parts = [];
      if (state.downloadedAt) parts.push("最後下載：" + formatDate(state.downloadedAt));
      if (state.bytes) parts.push("離線包約 " + formatBytes(state.bytes));
      if (state.count) parts.push("已保存 " + state.count + " 個本站資源");
      if (state.highRes) parts.push("含商品高清圖片");
      if (state.failed) parts.push("略過 " + state.failed + " 個必要種子資源");
      if (state.outdated) parts.push("建議按「更新離線資料」");
      detailLine.textContent = parts.join(" · ") || "五個主頁籤已可使用離線備援。";
    } else {
      statusLine.textContent = navigator.onLine ? "尚未下載完整離線資料" : "目前沒有完整離線包";
      detailLine.textContent = navigator.onLine
        ? "基本包不下載商品高清原圖，容量較小；需要離線放大商品照片時再勾選高清圖片。"
        : "請恢復網路後下載離線旅行資料。";
    }

    if (state.ready) primaryButton.textContent = state.outdated ? "更新離線資料" : "重新下載／更新";
    else primaryButton.textContent = highResInput && highResInput.checked ? "下載完整離線資料" : "下載基本離線資料";

    primaryButton.disabled = state.busy || !navigator.onLine;
    clearButton.disabled = state.busy || !state.ready;
    if (highResInput) highResInput.disabled = state.busy || !navigator.onLine;
  }

  function workerFor(registration) {
    return navigator.serviceWorker.controller || registration.active || registration.waiting || registration.installing;
  }

  function send(type, payload) {
    return navigator.serviceWorker.ready.then(function (registration) {
      return new Promise(function (resolve, reject) {
        var worker = workerFor(registration);
        if (!worker) return reject(new Error("Service Worker 尚未啟動"));
        var channel = new MessageChannel();
        var timer = setTimeout(function () { reject(new Error("離線服務回應逾時")); }, 600000);
        channel.port1.onmessage = function (event) {
          clearTimeout(timer);
          var result = event.data || {};
          if (result.ok) resolve(result.status || {});
          else reject(new Error(result.error || "離線服務操作失敗"));
        };
        var message = { type: type };
        Object.keys(payload || {}).forEach(function (key) { message[key] = payload[key]; });
        worker.postMessage(message, [channel.port2]);
      });
    });
  }

  function applyStatus(status) {
    state.ready = Boolean(status && status.ready);
    state.downloadedAt = status && status.downloadedAt || null;
    state.count = status && status.count || 0;
    state.failed = status && status.failed || 0;
    state.bytes = status && status.bytes || 0;
    state.highRes = Boolean(status && status.highRes);
    state.outdated = Boolean(status && status.outdated);
    if (highResInput && !state.busy) highResInput.checked = state.highRes;
    render();
  }

  function refreshStatus() {
    return send("OFFLINE_STATUS").then(applyStatus).catch(function () { render(); });
  }

  function showDownloadError(error) {
    state.busy = false;
    state.progress = "";
    return send("OFFLINE_STATUS").then(function (status) {
      applyStatus(status);
    }).catch(function () {
      render();
    }).then(function () {
      if (!panel) return;
      statusLine.textContent = state.ready ? "⚠️ 離線資料更新未完成" : "⚠️ 離線資料下載未完成";
      detailLine.textContent = error.message + (state.ready
        ? "。上一份已完成的離線資料仍可使用。"
        : "。請保持網路連線後再試一次。");
    });
  }

  function download() {
    if (state.busy || !navigator.onLine) return;
    ensurePanel();
    state.busy = true;
    state.progress = "準備下載…";
    render();
    send("DOWNLOAD_OFFLINE", { includeHighRes: Boolean(highResInput && highResInput.checked) }).then(function (status) {
      state.busy = false;
      state.progress = "";
      applyStatus(status);
    }).catch(showDownloadError);
  }

  function clear() {
    if (state.busy || !state.ready) return;
    state.busy = true;
    render();
    send("CLEAR_OFFLINE").then(function (status) {
      state.busy = false;
      applyStatus(status);
      if (highResInput) highResInput.checked = false;
    }).catch(function (error) {
      state.busy = false;
      render();
      if (panel) detailLine.textContent = error.message;
    });
  }

  function bindBadge() {
    if (!badge || badge.dataset.offlineBound) return;
    badge.dataset.offlineBound = "1";
    badge.addEventListener("click", openPanel);
    badge.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPanel();
      }
    });
  }

  navigator.serviceWorker.addEventListener("message", function (event) {
    var data = event.data || {};
    if (data.type !== "OFFLINE_PROGRESS") return;
    if (data.phase === "start" || data.phase === "download") {
      state.busy = true;
      var total = data.total || 0;
      var processed = data.processed || data.completed || 0;
      var pieces = ["已處理 " + processed + " 個"];
      if (total) pieces.push("目前已發現約 " + total + " 個資源");
      if (data.bytes) pieces.push("已下載約 " + formatBytes(data.bytes));
      state.progress = pieces.join(" · ");
      render();
    }
  });

  window.addEventListener("online", function () { setTimeout(render, 0); });
  window.addEventListener("offline", function () { setTimeout(render, 0); });
  document.addEventListener("DOMContentLoaded", function () {
    bindBadge();
    setTimeout(renderBadge, 0);
  });

  navigator.serviceWorker.addEventListener("controllerchange", function () {
    setTimeout(refreshStatus, 50);
  });

  navigator.serviceWorker.register(swUrl.href, { scope: rootUrl.pathname })
    .then(function (registration) {
      bindBadge();
      try { registration.update(); } catch (_) {}
      return refreshStatus();
    })
    .catch(function () {
      bindBadge();
      render();
    });
})();

/*
 * Transport renderer module.
 *
 * Extracted from common.js as a pure renderer factory. This file is inert until
 * a page explicitly wires it, so the current runtime and UI remain unchanged.
 */
(function (root) {
  function createRenderer(deps) {
    deps = deps || {};

    var data = deps.data || [];
    var state = deps.state || {};
    var $ = deps.$ || function (selector) { return document.querySelector(selector); };
    var $$ = deps.$$ || function (selector, scope) {
      return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
    };
    var escapeHtml = deps.escapeHtml || function (value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };
    var statusClass = deps.statusClass || function () { return ""; };
    var fmtCost = deps.fmtCost || function (currency, cost) {
      return [currency, cost].filter(function (v) { return v != null && v !== ""; }).join(" ");
    };

    // Restore the flight-only rows removed during the transport page split.
    // Times use the existing itinerary's departures and each airline's window.
    var flightCheckins = {
      "TPE→VIE／AMS→TPE": {
        url: "https://airportservice.china-airlines.com/eCheckin/eCheckin_home?country=tw&locale=zh",
        time: "9/22 23:45（台灣時間，起飛前48小時）／10/8 11:00（荷蘭時間，起飛前48小時）",
        how: "輸入訂位代號與護照英文姓名，依華航頁面指示完成報到。"
      },
      "VIE→HEL": {
        url: "https://www.finnair.com/en/manage/check-in",
        time: "9/24 23:35（維也納時間，起飛前36小時）",
        how: "輸入訂位代號或電子機票號碼與英文姓氏（Last Name）。"
      },
      "KKN→TOS": {
        url: "https://www.wideroe.no/en/my-trips",
        time: "10/2 11:40（挪威時間，起飛前22小時）",
        how: "使用Widerøe My trips或App，輸入訂位代號與英文姓氏後選擇Check in。"
      },
      "TOS→OSL→AMS": {
        url: "https://www.flysas.com/en/checkin",
        time: "10/7 05:50（挪威時間，起飛前30小時）",
        how: "輸入訂位代號與英文姓氏（Last Name）。"
      }
    };

    function flightCheckinRows(transport) {
      var details = transport.type === "航班" && flightCheckins[transport.route];
      if (!details) return "";
      return '<div class="info-card-row flight-checkin-row"><span>網路報到網址</span><b><a href="' + escapeHtml(details.url) + '" target="_blank" rel="noopener noreferrer">開啟報到頁面 ↗</a></b></div>' +
        '<div class="info-card-row flight-checkin-row"><span>網路報到時間</span><b>' + escapeHtml(details.time) + '</b></div>' +
        '<div class="info-card-row flight-checkin-row"><span>如何報到</span><b>' + escapeHtml(details.how) + '</b></div>';
    }

    return function renderTransport() {
      var cats = ["全部"].concat(Array.from(new Set(data.map(function (t) { return t.type; }))));
      $("#transportFilters").innerHTML = cats.map(function (v) {
        return `<button class="filter-chip ${state.transportFilter === v ? "active" : ""}" data-filter="${escapeHtml(v)}">${escapeHtml(v)}</button>`;
      }).join("");
      $$("#transportFilters .filter-chip").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.transportFilter = btn.dataset.filter;
          renderTransport();
        });
      });
      var rows = data.filter(function (t) {
        return state.transportFilter === "全部" || t.type === state.transportFilter;
      });
      $("#transportList").innerHTML = rows.map(function (t) {
        return `<article class="info-card transport-card"><div class="event-top"><div><span class="event-type">${escapeHtml(t.date)} · ${escapeHtml(t.type)}</span><h3>${escapeHtml(t.route)}</h3></div><span class="status ${statusClass(t.status)}">${escapeHtml(t.status)}</span></div><p class="subtitle">${escapeHtml(t.service)}</p><div class="info-card-row"><span>時間</span><b>${escapeHtml(t.time)}</b></div><div class="info-card-row"><span>方式</span><b>${escapeHtml(t.method)}</b></div><div class="info-card-row"><span>時長</span><b>${escapeHtml(t.duration)}</b></div><div class="info-card-row"><span>費用／人</span><b>${escapeHtml(fmtCost(t.currency,t.cost))}</b></div><div class="info-card-row"><span>提醒</span><b>${escapeHtml(t.note)}</b></div>${flightCheckinRows(t)}</article>`;
      }).join("");
    };
  }

  root.TravelTransportRenderer = Object.freeze({
    create: createRenderer
  });
})(window);

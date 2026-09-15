/*
 * Shared runtime entry point.
 *
 * All dependencies are requested together and executed in their declared order.
 * Setting async=false before inserting dynamic classic scripts preserves that
 * order while allowing the browser to download the files in parallel.
 */
(function () {
  "use strict";

  var current = document.currentScript;
  var src = current && current.src;
  var base = src ? src.slice(0, src.lastIndexOf("/") + 1) : "";
  var pageName = document.body && document.body.getAttribute("data-page");
  var isDailyPage = pageName === "days";
  var scripts = [
    base + "data/packing.js",
    base + "data/core.js",
    base + "data/print.js",
    base + "modules/common-utils.js",
    base + "modules/common-runtime-tools.js?v=20260915-perf2",
    base + "modules/common-runtime-view.js",
    base + "modules/common-runtime-init.js?v=20260915-perf2",
    base + "modules/common-runtime-info.js",
    base + "common-runtime.js",
    base + "modules/flight-badges.js"
  ];

  if (isDailyPage) {
    window.TRAVEL_DEFER_RUNTIME_INIT = true;
    scripts.push(
      base + "data/itinerary.js",
      base + "modules/daily-day1-overrides.js",
      base + "modules/daily-day2-overrides.js",
      base + "modules/daily-day5-overrides.js",
      base + "modules/daily-day9-overrides.js",
      base + "modules/daily-day10-overrides.js",
      base + "modules/daily-day11-overrides.js",
      base + "modules/daily-day12-overrides.js",
      base + "modules/daily-day13-overrides.js",
      base + "modules/daily-day15-overrides.js",
      base + "modules/daily-day16-overrides.js",
      base + "modules/daily-day17-overrides.js",
      base + "modules/daily-logic.js",
      base + "modules/daily-scroll.js",
      base + "modules/daily-render.js",
      base + "modules/daily-timezone.js",
      base + "modules/daily.js",
      base + "modules/daily-event-filters.js",
      base + "modules/runtime-utils.js",
      base + "data/apps.js",
      base + "modules/apps-renderer.js",
      base + "modules/apps.js",
      base + "modules/apps-bootstrap.js",
      base + "data/stay.js",
      base + "modules/stay-renderer.js",
      base + "modules/stay.js",
      base + "modules/stay-bootstrap.js"
    );
  } else if (pageName === "transport") {
    scripts.push(
      base + "data/transport.js",
      base + "modules/transport-renderer.js",
      base + "modules/transport-data-enhancements.js",
      base + "modules/transport-enhancements.js",
      base + "modules/transport-filters.js"
    );
  } else if (pageName === "hotels") {
    scripts.push(
      base + "data/stay.js",
      base + "modules/stay-renderer.js",
      base + "modules/stay.js",
      base + "modules/stay-bootstrap.js"
    );
  }

  // Offline controls load last and do not participate in the critical render path.
  scripts.push(base + "offline-manager.js?v=20260915-offline2");

  scripts.forEach(function (scriptSrc, index) {
    var script = document.createElement("script");
    script.src = scriptSrc;
    script.async = false;
    if (isDailyPage && index === scripts.length - 1) {
      script.addEventListener("load", function () {
        if (window.TravelCommonRuntimeStart) window.TravelCommonRuntimeStart();
      });
    }
    document.head.appendChild(script);
  });
})();

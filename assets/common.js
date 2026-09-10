/*
 * Shared runtime entry point.
 *
 * Ported from chun-assistant/travel@cef482dab43f39e9fd8cee34a4b0aae102517db8.
 * Keep this file intentionally tiny; feature code lives under assets/data and assets/modules.
 * Target-repo compatibility: Stay modules are auto-loaded on data-page="hotels" so the
 * current Stay HTML can remain untouched.
 */
(function () {
  var current = document.currentScript;
  var src = current && current.src;
  var base = src ? src.slice(0, src.lastIndexOf("/") + 1) : "";
  var packingDataSrc = base + "data/packing.js";
  var coreDataSrc = base + "data/core.js";
  var printDataSrc = base + "data/print.js";
  var utilsSrc = base + "modules/common-utils.js";
  var legacySrc = base + "common-legacy.js";
  var page = document.body && document.body.getAttribute("data-page");
  var isDailyPage = page === "days";
  var isStayPage = page === "hotels";

  function stayScripts() {
    return [
      base + "data/stay.js",
      base + "modules/stay-renderer.js",
      base + "modules/stay.js",
      base + "modules/stay-bootstrap.js"
    ];
  }

  if (document.readyState === "loading" && document.write) {
    document.write('<script src="' + packingDataSrc + '"><\/script>');
    document.write('<script src="' + coreDataSrc + '"><\/script>');
    document.write('<script src="' + printDataSrc + '"><\/script>');
    document.write('<script src="' + utilsSrc + '"><\/script>');
    document.write('<script src="' + legacySrc.replace(/"/g, "&quot;") + '"><\/script>');
    document.write('<script src="' + base + 'modules/flight-badges.js' + '"><\/script>');

    if (isDailyPage) {
      document.write('<script src="' + base + 'data/itinerary.js' + '"><\/script>');
      document.write('<script src="' + base + 'modules/daily-logic.js' + '"><\/script>');
      document.write('<script src="' + base + 'modules/daily-scroll.js' + '"><\/script>');
      document.write('<script src="' + base + 'modules/daily-render.js' + '"><\/script>');
      document.write('<script src="' + base + 'modules/daily.js' + '"><\/script>');
      document.write('<script src="' + base + 'modules/daily-event-filters.js"><\/script>');
      document.write('<script src="' + base + 'modules/runtime-utils.js"><\/script>');
      document.write('<script src="' + base + 'data/apps.js"><\/script>');
      document.write('<script src="' + base + 'modules/apps-renderer.js"><\/script>');
      document.write('<script src="' + base + 'modules/apps.js"><\/script>');
      document.write('<script src="' + base + 'modules/apps-bootstrap.js"><\/script>');
    }
    if (isDailyPage || isStayPage) {
      stayScripts().forEach(function (url) {
        document.write('<script src="' + url + '"><\/script>');
      });
    }
    return;
  }

  var scripts = [packingDataSrc, printDataSrc, coreDataSrc, utilsSrc, legacySrc, base + "modules/flight-badges.js"];
  if (isDailyPage) {
    scripts.push(
      base + "data/itinerary.js",
      base + "modules/daily-logic.js",
      base + "modules/daily-scroll.js",
      base + "modules/daily-render.js",
      base + "modules/daily.js",
      base + "modules/daily-event-filters.js",
      base + "modules/runtime-utils.js",
      base + "data/apps.js",
      base + "modules/apps-renderer.js",
      base + "modules/apps.js",
      base + "modules/apps-bootstrap.js"
    );
  }
  if (isDailyPage || isStayPage) scripts = scripts.concat(stayScripts());

  var index = 0;
  function loadNext() {
    if (index >= scripts.length) return;
    var script = document.createElement("script");
    script.src = scripts[index++];
    script.async = false;
    script.onload = loadNext;
    document.head.appendChild(script);
  }
  loadNext();
})();

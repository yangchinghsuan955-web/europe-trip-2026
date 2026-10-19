import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function source(path) {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

function daily() {
  const context = vm.createContext({ window: {}, URLSearchParams, Intl, Date });
  for (const path of ["assets/data/core.js", "assets/modules/common-utils.js", "assets/modules/common-runtime-view.js"]) {
    vm.runInContext(source(path), context);
  }
  vm.runInContext("const APP_DATA = window.TravelCoreData.getAppData();", context);
  const scripts = [...source("daily/index.html").matchAll(/src="\.\.\/(assets\/modules\/daily-day\d+-overrides\.js)[^"]*"/g)];
  scripts.forEach(match => vm.runInContext(source(match[1]), context));
  const data = context.window.TravelCoreData.getAppData();
  const view = context.window.TravelCommonRuntimeView.setup({
    ...context.window.TravelCommonUtils,
    APP_DATA: data, COUNTRY_STAGES: [], state: {}, $: () => null, $$: () => []
  });
  return { data, view };
}

test("all eight restored navigation buttons use the saved custom URLs", () => {
  const { data, view } = daily();
  const stops = [[8, "11:00"], [11, "07:30"], [11, "18:00"], [11, "18:45"],
    [11, "19:15"], [12, "12:15"], [12, "12:35"], [12, "13:30"]];
  stops.forEach(([day, start]) => {
    const event = data.events.find(event => event.day === day && event.start === start);
    assert.ok(event, `Day ${day} ${start}`);
    assert.equal(event.navigationMap, event.map, event.title);
    assert.ok(event.navigationMap.startsWith("https://www.google.com/maps/search/?api=1&query="));
    assert.ok(view.eventCard(event).includes(`href="${event.map.replaceAll("&", "&amp;")}"`), event.title);
  });
  assert.equal(data.events.length, 256);
  assert.equal(data.events.filter(event => view.isNavigableEvent(event)).length, 141);
  assert.equal(data.events.filter(event => event.navigationMap).length, 17);
});

function transportRenderer(data, state = { transportFilter: "全部" }) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(source("assets/modules/transport-renderer.js"), context);
  const elements = { "#transportList": { innerHTML: "" }, "#transportFilters": { innerHTML: "" } };
  const render = context.window.TravelTransportRenderer.create({
    data, state, $: selector => elements[selector], $$: () => [], statusClass: () => ""
  });
  return { render, state, html: () => elements["#transportList"].innerHTML };
}

function transportData() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(source("assets/data/core.js"), context);
  return context.window.TravelCoreData.getAppData().transport;
}

test("all four flight cards include check-in links, local opening times and instructions", () => {
  const renderer = transportRenderer(transportData());
  renderer.render();
  const html = renderer.html();
  assert.equal((html.match(/開啟報到頁面 ↗/g) || []).length, 4);
  assert.equal((html.match(/網路報到時間/g) || []).length, 4);
  assert.equal((html.match(/如何報到/g) || []).length, 4);
  for (const url of ["https://airportservice.china-airlines.com/eCheckin/eCheckin_home?country=tw&amp;locale=zh",
    "https://www.finnair.com/en/manage/check-in", "https://www.wideroe.no/en/my-trips", "https://www.flysas.com/en/checkin"]) {
    assert.ok(html.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`), url);
  }
  assert.match(html, /10\/2 11:40（挪威時間，起飛前22小時）/);
  assert.match(html, /9\/24 23:35（維也納時間，起飛前36小時）/);
  assert.match(html, /10\/7 05:50（挪威時間，起飛前30小時）/);
});

test("switching transport filters keeps restored links without duplication", () => {
  const renderer = transportRenderer(transportData());
  for (const filter of ["全部", "航班", "火車", "航班", "全部"]) {
    renderer.state.transportFilter = filter;
    renderer.render();
    assert.equal((renderer.html().match(/開啟報到頁面 ↗/g) || []).length, filter === "火車" ? 0 : 4);
  }
});

test("offline package identifies the restored links as a new version", () => {
  const workerVersion = source("service-worker.js").match(/const VERSION = "([^"]+)"/)[1];
  const manager = source("assets/offline-manager.js");
  assert.equal(workerVersion, "20261019-links1");
  assert.ok(manager.includes(`var version = "${workerVersion}"`));
  assert.ok(manager.includes(`service-worker.js?v=${workerVersion}`));
  assert.match(source("assets/common.js"), /transport-renderer\.js\?v=20261019-links1/);
  for (const day of [8, 11, 12]) {
    assert.ok(source("daily/index.html").includes(`daily-day${day}-overrides.js?v=20261019-links1`));
  }
});

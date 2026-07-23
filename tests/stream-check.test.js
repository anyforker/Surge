const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const scriptSource = fs.readFileSync(
  path.join(root, "module/panel/stream-check.js"),
  "utf8"
);

const URLS = {
  youtube: "https://www.youtube.com/premium",
  netflixFull: "https://www.netflix.com/title/81280792",
  netflixOriginal: "https://www.netflix.com/title/80018499",
  prime: "https://www.primevideo.com",
  disneyHome: "https://www.disneyplus.com/",
  disneyLocation: "https://disney.api.edge.bamgrid.com/graph/v1/device/graphql",
};

function disneyLocation(countryCode = "US", inSupportedLocation = true) {
  return JSON.stringify({
    extensions: {
      sdk: {
        session: {
          inSupportedLocation,
          location: { countryCode },
        },
      },
    },
  });
}

function successfulRoutes() {
  return {
    [URLS.youtube]: {
      status: 200,
      body: '<script>"countryCode":"US"</script>',
    },
    [URLS.netflixFull]: {
      status: 200,
      headers: { "X-Originating-URL": "https://www.netflix.com/us/title/81280792" },
      body: "ok",
    },
    [URLS.prime]: {
      status: 200,
      body: '<script>"currentTerritory":"US"</script>',
    },
    [URLS.disneyHome]: {
      status: 200,
      body: "Region: US; CNBL: 1",
    },
    [URLS.disneyLocation]: {
      status: 200,
      body: disneyLocation(),
    },
  };
}

function runScript(routes) {
  return new Promise((resolve, reject) => {
    const requests = [];
    const deadline = setTimeout(
      () => reject(new Error("script did not call $done")),
      250
    );

    function invoke(options, callback) {
      requests.push(options.url);
      const route = routes[options.url];
      if (!route || route.hang) return;

      queueMicrotask(() => {
        callback(
          route.error || null,
          route.noResponse
            ? undefined
            : { status: route.status ?? 200, headers: route.headers || {} },
          route.body
        );
      });
    }

    const context = {
      $httpClient: { get: invoke, post: invoke },
      $done(result) {
        clearTimeout(deadline);
        resolve({ result, requests });
      },
      console: { log() {} },
      setTimeout(callback, delay) {
        return setTimeout(callback, delay >= 7000 ? 10 : delay);
      },
      clearTimeout,
    };

    vm.runInNewContext(scriptSource, context, { filename: "stream-check.js" });
  });
}

test("renders four successful checks in stable order", async () => {
  const { result, requests } = await runScript(successfulRoutes());

  assert.equal(
    result.content,
    [
      "YouTube: 已解锁 ➟ US",
      "Netflix: 已完整解锁 ➟ US",
      "Amazon Prime: 已解锁 ➟ US",
      "Disney+: 已解锁 ➟ US",
    ].join("\n")
  );
  assert.deepEqual(
    requests.sort(),
    Object.values(URLS)
      .filter((url) => url !== URLS.netflixOriginal)
      .sort()
  );
});

test("reports unknown regions instead of defaulting to US", async () => {
  const routes = successfulRoutes();
  routes[URLS.youtube].body = "Premium landing page without a country";
  routes[URLS.netflixFull].headers = {};
  routes[URLS.prime].body = "Prime Video landing page without territory data";

  const { result } = await runScript(routes);

  assert.match(result.content, /^YouTube: 状态未知/m);
  assert.match(result.content, /^Netflix: 已完整解锁$/m);
  assert.match(result.content, /^Amazon Prime: 状态未知$/m);
});

test("reads YouTube's current client-region field", async () => {
  const routes = successfulRoutes();
  routes[URLS.youtube].body = '<script>"gl":"JP"</script>';

  const { result } = await runScript(routes);
  assert.match(result.content, /^YouTube: 已解锁 ➟ JP$/m);
});

test("isolates a timed-out service and still returns partial results", async () => {
  const routes = successfulRoutes();
  routes[URLS.youtube] = { hang: true };

  const { result } = await runScript(routes);

  assert.match(result.content, /^YouTube: 检测超时$/m);
  assert.match(result.content, /^Netflix: 已完整解锁 ➟ US$/m);
  assert.match(result.content, /^Disney\+: 已解锁 ➟ US$/m);
});

test("contains malformed callback and Disney JSON responses", async () => {
  const routes = successfulRoutes();
  routes[URLS.youtube] = { noResponse: true };
  routes[URLS.disneyLocation].body = "not-json";

  const { result } = await runScript(routes);

  assert.match(result.content, /^YouTube: 检测失败，请刷新面板$/m);
  assert.match(result.content, /^Disney\+: 状态未知 ➟ US$/m);
});

test("uses Disney CNBL only to classify coming-soon regions", async () => {
  const routes = successfulRoutes();
  routes[URLS.disneyHome].body = "Region: DE; CNBL: 2";
  routes[URLS.disneyLocation].body = disneyLocation("DE", false);

  const { result } = await runScript(routes);
  assert.match(result.content, /^Disney\+: 即将登陆 ➟ DE$/m);

  routes[URLS.disneyHome].body = "Region: DE; CNBL: 1";
  const second = await runScript(routes);
  assert.match(second.result.content, /^Disney\+: 不支持解锁$/m);
});

test("module declares a native Surge panel argument", () => {
  const moduleSource = fs.readFileSync(
    path.join(root, "module/stream-media.sgmodule"),
    "utf8"
  );

  assert.match(moduleSource, /^#!arguments=UPDATE_INTERVAL:600$/m);
  assert.match(moduleSource, /update-interval=\{\{\{UPDATE_INTERVAL\}\}\}/);
  assert.match(
    moduleSource,
    /script-path=https:\/\/raw\.githubusercontent\.com\/anyforker\/Surge\/[0-9a-f]{40}\/module\/panel\/stream-check\.js/
  );
  assert.doesNotMatch(moduleSource, /script-update-interval=/);
});

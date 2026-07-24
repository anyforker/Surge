const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const scriptSource = fs.readFileSync(
  path.join(root, "module/panel/ai-check.js"),
  "utf8"
);

const URLS = {
  chatgpt: "https://chatgpt.com/cdn-cgi/trace",
  claude: "https://claude.ai/cdn-cgi/trace",
  gemini: "https://gemini.google.com/generate_204",
  grokTrace: "https://grok.com/cdn-cgi/trace",
  grokProbe: "https://grok.com/rest/app-chat/conversations",
};

function successfulRoutes(region = "US") {
  return {
    [URLS.chatgpt]: { status: 200, body: `loc=${region}\ncolo=LAX` },
    [URLS.claude]: { status: 200, body: `loc=${region}\ncolo=LAX` },
    [URLS.gemini]: { status: 204, body: "" },
    [URLS.grokTrace]: { status: 200, body: `loc=${region}\ncolo=LAX` },
    [URLS.grokProbe]: { status: 401, body: '{"error":"unauthenticated"}' },
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
            : {
                status: route.status ?? 200,
                headers: route.headers || {},
              },
          route.body
        );
      });
    }

    const context = {
      $httpClient: { get: invoke },
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

    vm.runInNewContext(scriptSource, context, { filename: "ai-check.js" });
  });
}

test("renders four available services in stable order", async () => {
  const { result, requests } = await runScript(successfulRoutes());

  assert.equal(
    result.content,
    [
      "ChatGPT: 🟢 可用 · 🇺🇸 US",
      "Claude: 🟢 可用 · 🇺🇸 US",
      "Gemini: 🟢 可用 · 🇺🇸 US",
      "Grok: 🟢 可用 · 🇺🇸 US",
    ].join("\n")
  );
  assert.deepEqual(requests.sort(), Object.values(URLS).sort());
});

test("uses provider-specific regional availability", async () => {
  const routes = successfulRoutes();
  routes[URLS.chatgpt].body = "loc=HK\ncolo=HKG";
  routes[URLS.claude].body = "loc=CN\ncolo=SJC";

  const { result } = await runScript(routes);
  assert.match(result.content, /^ChatGPT: 🔴 当前地区不可用 · 🇭🇰 HK$/m);
  assert.match(result.content, /^Claude: 🔴 当前地区不可用 · 🇨🇳 CN$/m);
  assert.match(result.content, /^Gemini: 🟢 可用 · 🇭🇰 HK$/m);
});

test("isolates a timeout without hiding other providers", async () => {
  const routes = successfulRoutes();
  routes[URLS.claude] = { hang: true };

  const { result } = await runScript(routes);
  assert.match(result.content, /^ChatGPT: 🟢 可用 · 🇺🇸 US$/m);
  assert.match(result.content, /^Claude: 🟡 检测超时$/m);
  assert.match(result.content, /^Grok: 🟢 可用 · 🇺🇸 US$/m);
});

test("reports malformed responses and regional block markers safely", async () => {
  const routes = successfulRoutes();
  routes[URLS.chatgpt].body = "trace without a location";
  routes[URLS.gemini] = {
    status: 403,
    body: "Gemini is not currently available in your country",
  };

  const { result } = await runScript(routes);
  assert.match(result.content, /^ChatGPT: 🟡 状态未知$/m);
  assert.match(result.content, /^Gemini: 🔴 当前地区不可用 · 🇺🇸 US$/m);
});

test("keeps Gemini's own region when the endpoint provides one", async () => {
  const routes = successfulRoutes("US");
  routes[URLS.gemini].headers = { "x-country-code": "JP" };

  const { result } = await runScript(routes);
  assert.match(result.content, /^Gemini: 🟢 可用 · 🇯🇵 JP$/m);
});

test("treats Grok's unauthenticated API response as reachable", async () => {
  const routes = successfulRoutes("JP");
  routes[URLS.grokProbe].headers = { "x-country-code": "JP" };

  const { result } = await runScript(routes);
  assert.match(result.content, /^Grok: 🟢 可用 · 🇯🇵 JP$/m);
});

test("module declares the AI panel and repository-maintained script", () => {
  const moduleSource = fs.readFileSync(
    path.join(root, "module/ai-check.sgmodule"),
    "utf8"
  );

  assert.match(moduleSource, /^#!name=AI 可用性检测$/m);
  assert.match(moduleSource, /^#!version=1\.0\.1$/m);
  assert.match(moduleSource, /^#!arguments=UPDATE_INTERVAL:600$/m);
  assert.match(moduleSource, /update-interval=\{\{\{UPDATE_INTERVAL\}\}\}/);
  assert.match(
    moduleSource,
    /script-path=https:\/\/raw\.githubusercontent\.com\/anyforker\/Surge\/main\/module\/panel\/ai-check\.js/
  );
});

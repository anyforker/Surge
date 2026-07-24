const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const moduleDir = path.join(root, "module");
const panelDir = path.join(moduleDir, "panel");
const repoRawBase =
  "https://raw.githubusercontent.com/anyforker/Surge/main/";
const panelRawBase =
  "https://raw.githubusercontent.com/anyforker/Surge/main/module/panel/";

const modules = [
  "ai-check.sgmodule",
  "app-adblock.sgmodule",
  "flush-dns.sgmodule",
  "iringo-location-service.sgmodule",
  "iringo-weatherkit.sgmodule",
  "network-info.sgmodule",
  "network-interface-info.sgmodule",
  "network-speed.sgmodule",
  "stream-media.sgmodule",
  "web-adblock.sgmodule",
  "wechat-adblock.sgmodule",
  "weibo-lite-adblock.sgmodule",
  "youtube-adblock.sgmodule",
  "youtube-enhance.sgmodule",
];

const syncedAdblockModules = new Map([
  ["app-adblock.sgmodule", "应用广告过滤"],
  ["wechat-adblock.sgmodule", "微信公众号去广告"],
  ["weibo-lite-adblock.sgmodule", "微博轻享版去广告"],
  ["youtube-adblock.sgmodule", "YouTube 去广告"],
  ["youtube-enhance.sgmodule", "YouTube 增强"],
]);

const panelModules = new Map([
  ["ai-check.sgmodule", "AI 可用性检测"],
  ["flush-dns.sgmodule", "DNS 缓存清理"],
  ["network-info.sgmodule", "网络信息"],
  ["network-interface-info.sgmodule", "网络接口信息"],
  ["network-speed.sgmodule", "网络测速"],
  ["stream-media.sgmodule", "流媒体解锁检测"],
]);

const expectedScripts = [
  "ai-check.js",
  "flush-dns.js",
  "iringo-location-request.js",
  "iringo-location-response.js",
  "iringo-weatherkit-response.js",
  "network-info.js",
  "network-interface-info.js",
  "network-speed.js",
  "stream-media.js",
  "web-adblock-agent.js",
  "web-adblock-cnys.js",
  "web-adblock-element.js",
  "web-adblock-function.js",
  "web-adblock-user.js",
  "web-adblock.js",
];

const locallyMaintainedScripts = new Set(["ai-check.js", "stream-media.js"]);

test("all managed module script paths use existing files in this repository", () => {
  const paths = modules.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(moduleDir, moduleName), "utf8");
    return [
      ...source.matchAll(/script-path\s*=\s*(https:\/\/[^,\s]+\.js)/g),
    ].map((match) => match[1]);
  });

  assert.ok(paths.length > 0);
  for (const scriptPath of paths) {
    assert.ok(scriptPath.startsWith(repoRawBase), scriptPath);
    const relativePath = scriptPath.slice(repoRawBase.length);
    assert.ok(fs.existsSync(path.join(root, relativePath)), relativePath);
  }
});

test("synced AdBlock modules have normalized metadata and local resources", () => {
  for (const [moduleName, expectedName] of syncedAdblockModules) {
    const source = fs.readFileSync(path.join(moduleDir, moduleName), "utf8");

    assert.match(source, new RegExp(`^#!name=${expectedName}$`, "m"));
    assert.match(source, /^#!category=AdBlock$/m);
    assert.match(source, /^#!date=\d{4}-\d{2}-\d{2}$/m);
    assert.match(source, /^#!version=\d+\.\d+\.\d+$/m);

    for (const match of source.matchAll(/data="(https:\/\/[^\"]+)/g)) {
      const resourceUrl = match[1];
      assert.ok(resourceUrl.startsWith(repoRawBase), resourceUrl);
      const relativePath = resourceUrl.slice(repoRawBase.length);
      assert.ok(fs.existsSync(path.join(root, relativePath)), relativePath);
    }
  }
});

test("AdBlock upstream manifest covers the five synced modules", () => {
  const manifest = fs.readFileSync(
    path.join(root, "scripts/adblock-module-sources.tsv"),
    "utf8"
  );
  const actualModules = manifest
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => path.basename(line.split("\t")[0]))
    .sort();

  assert.deepEqual(actualModules, [...syncedAdblockModules.keys()].sort());
});

test("README lists every managed module Raw URL", () => {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");

  for (const moduleName of modules) {
    assert.match(
      readme,
      new RegExp(
        `^https://raw\\.githubusercontent\\.com/anyforker/Surge/main/module/${moduleName}$`,
        "m"
      )
    );
  }
});

test("panel filenames follow one kebab-case style", () => {
  const actualScripts = fs
    .readdirSync(panelDir)
    .filter((filename) => filename.endsWith(".js"))
    .sort();

  assert.deepEqual(actualScripts, expectedScripts.slice().sort());
  for (const filename of actualScripts) {
    assert.match(filename, /^[a-z0-9]+(?:-[a-z0-9]+)*\.js$/);
  }
});

test("upstream sync manifest covers only mirrored scripts", () => {
  const manifest = fs.readFileSync(
    path.join(root, "scripts/module-script-sources.tsv"),
    "utf8"
  );
  const mirroredScripts = manifest
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => path.basename(line.split("\t")[0]))
    .sort();
  const expectedMirrors = expectedScripts
    .filter((filename) => !locallyMaintainedScripts.has(filename))
    .sort();

  assert.deepEqual(mirroredScripts, expectedMirrors);
});

test("visible panel titles match their module names", () => {
  for (const [moduleName, expectedTitle] of panelModules) {
    const source = fs.readFileSync(path.join(moduleDir, moduleName), "utf8");
    const panelSection = source.match(/\[Panel\]\n([\s\S]*?)(?=\n\[|$)/)?.[1];

    assert.ok(panelSection, moduleName);
    assert.match(source, /^#!date=\d{4}-\d{2}-\d{2}$/m);
    assert.match(source, /^#!version=\d+\.\d+\.\d+$/m);
    assert.match(
      panelSection,
      new RegExp(`^${expectedTitle} = .*title="${expectedTitle}"`, "m")
    );
  }

  const flushDns = fs.readFileSync(
    path.join(moduleDir, "flush-dns.sgmodule"),
    "utf8"
  );
  assert.match(flushDns, /^#!arguments=TITLE:DNS 缓存清理,/m);

  for (const [moduleName, expectedTitle] of [
    ["network-info.sgmodule", "网络信息"],
    ["network-interface-info.sgmodule", "网络接口信息"],
    ["network-speed.sgmodule", "网络测速"],
  ]) {
    const source = fs.readFileSync(path.join(moduleDir, moduleName), "utf8");
    assert.match(source, new RegExp(`argument="?title=${expectedTitle}&`));
  }
});

test("web adblock runtime helper scripts use this repository", () => {
  const mainSource = fs.readFileSync(
    path.join(panelDir, "web-adblock.js"),
    "utf8"
  );
  const cnysSource = fs.readFileSync(
    path.join(panelDir, "web-adblock-cnys.js"),
    "utf8"
  );

  for (const filename of [
    "web-adblock-user.js",
    "web-adblock-function.js",
    "web-adblock-element.js",
    "web-adblock-agent.js",
  ]) {
    assert.match(mainSource, new RegExp(`${panelRawBase}${filename}`));
  }
  assert.match(cnysSource, new RegExp(`${panelRawBase}web-adblock-user\\.js`));
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const moduleDir = path.join(root, "module");
const panelDir = path.join(moduleDir, "panel");
const rawBase =
  "https://raw.githubusercontent.com/anyforker/Surge/main/module/panel/";

const modules = [
  "ai-check.sgmodule",
  "app-startup-ad.sgmodule",
  "bilibili-adblock.sgmodule",
  "flush-dns.sgmodule",
  "iringo-location-service.sgmodule",
  "iringo-weatherkit.sgmodule",
  "network-info.sgmodule",
  "network-interface-info.sgmodule",
  "network-speed.sgmodule",
  "spotify-enhancement.sgmodule",
  "stream-media.sgmodule",
  "web-adblock.sgmodule",
  "youtube-adblock.sgmodule",
];

const upstreamModuleMirrors = new Set([
  "app-startup-ad.sgmodule",
  "bilibili-adblock.sgmodule",
  "spotify-enhancement.sgmodule",
  "youtube-adblock.sgmodule",
]);
const repositoryManagedScriptModules = modules.filter(
  (moduleName) => !upstreamModuleMirrors.has(moduleName)
);

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

const locallyMaintainedScripts = new Set([
  "ai-check.js",
  "network-speed.js",
  "stream-media.js",
]);

test("all managed module script paths use this repository", () => {
  const paths = repositoryManagedScriptModules.flatMap((moduleName) => {
    const source = fs.readFileSync(path.join(moduleDir, moduleName), "utf8");
    return [...source.matchAll(/script-path=(https:\/\/[^,\s]+\.js)/g)].map(
      (match) => match[1]
    );
  });

  assert.ok(paths.length > 0);
  for (const scriptPath of paths) {
    assert.ok(scriptPath.startsWith(rawBase), scriptPath);
    const filename = scriptPath.slice(rawBase.length);
    assert.ok(fs.existsSync(path.join(panelDir, filename)), filename);
  }
});

test("upstream module mirror has a declared source and required sections", () => {
  const manifest = fs.readFileSync(
    path.join(root, "scripts/upstream-module-sources.tsv"),
    "utf8"
  );
  const entries = manifest
    .split("\n")
    .filter((line) => line && !line.startsWith("#"));

  assert.deepEqual(entries, [
    "module/app-startup-ad.sgmodule\thttps://yfamilys.com/module/startingad.sgmodule\tyfamilys-adblock",
    "module/bilibili-adblock.sgmodule\thttps://github.com/BiliUniverse/ADBlock/releases/latest/download/BiliBili.ADBlock.sgmodule\tbiliuniverse-adblock",
    "module/spotify-enhancement.sgmodule\thttps://raw.githubusercontent.com/app2smile/rules/master/module/spotify.module\tspotify-enhancement",
    "module/youtube-adblock.sgmodule\thttps://raw.githubusercontent.com/Maasea/sgmodule/master/YouTube.Enhance.sgmodule\tyoutube-enhance-adblock",
  ]);

  const source = fs.readFileSync(
    path.join(moduleDir, "app-startup-ad.sgmodule"),
    "utf8"
  );
  assert.match(source, /^#!name=应用广告过滤$/m);
  assert.match(source, /^#!category=AdBlock$/m);
  assert.match(source, /^#!homepage=https:\/\/yfamilys\.com$/m);
  for (const section of ["URL Rewrite", "Script", "MITM", "Map Local"]) {
    assert.match(source, new RegExp(`^\\[${section}\\]$`, "m"));
  }

  const bilibili = fs.readFileSync(
    path.join(moduleDir, "bilibili-adblock.sgmodule"),
    "utf8"
  );
  assert.match(bilibili, /^#!name=哔哩哔哩广告过滤$/m);
  assert.match(bilibili, /^#!category=AdBlock$/m);
  assert.match(
    bilibili,
    /^#!homepage\s*=\s*https:\/\/ADBlock\.BiliUniverse\.io$/m
  );
  assert.match(bilibili, /app\.bilibili\.com/);
  assert.match(bilibili, /grpc\.biliapi\.net/);
  for (const section of [
    "URL Rewrite",
    "Map Local",
    "Body Rewrite",
    "Script",
    "MITM",
  ]) {
    assert.match(bilibili, new RegExp(`^\\[${section}\\]$`, "m"));
  }

  const webAdblock = fs.readFileSync(
    path.join(moduleDir, "web-adblock.sgmodule"),
    "utf8"
  );
  assert.match(webAdblock, /^#!name=网页广告过滤$/m);

  const spotify = fs.readFileSync(
    path.join(moduleDir, "spotify-enhancement.sgmodule"),
    "utf8"
  );
  assert.match(spotify, /^#!name=Spotify 功能增强$/m);
  assert.match(spotify, /^#!category=Enhancement$/m);
  assert.match(spotify, /spclient\.wg\.spotify\.com/);
  for (const section of ["Header Rewrite", "Script", "MITM"]) {
    assert.match(spotify, new RegExp(`^\\[${section}\\]$`, "m"));
  }

  const youtube = fs.readFileSync(
    path.join(moduleDir, "youtube-adblock.sgmodule"),
    "utf8"
  );
  assert.match(youtube, /^#!name=YouTube 广告过滤$/m);
  assert.match(youtube, /^#!category=AdBlock$/m);
  assert.match(youtube, /youtubei\.googleapis\.com/);
  assert.match(youtube, /\*\.googlevideo\.com/);
  for (const section of ["Script", "MITM"]) {
    assert.match(youtube, new RegExp(`^\\[${section}\\]$`, "m"));
  }
});

test("module README lists every managed module Raw URL", () => {
  const readme = fs.readFileSync(
    path.join(moduleDir, "README.md"),
    "utf8"
  );

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

test("root README routes to each detailed directory guide", () => {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");

  for (const guide of [
    "module/README.md",
    "rule/README.md",
    "config/README.md",
    "icons/README.md",
    "scripts/README.md",
  ]) {
    assert.match(readme, new RegExp(`\\(${guide.replace("/", "\\/")}\\)`));
    assert.ok(fs.existsSync(path.join(root, guide)), guide);
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

test("network speed module uses bounded multi-sample measurements", () => {
  const moduleSource = fs.readFileSync(
    path.join(moduleDir, "network-speed.sgmodule"),
    "utf8"
  );
  const scriptSource = fs.readFileSync(
    path.join(panelDir, "network-speed.js"),
    "utf8"
  );

  assert.match(moduleSource, /^#!version=2\.0\.0$/m);
  assert.match(moduleSource, /Speed = type=generic,timeout=30,/);
  for (const argument of [
    "policy=Proxy",
    "duration=3",
    "min_mb=8",
    "max_mb=64",
    "connections=4",
    "ping_samples=5",
  ]) {
    assert.match(moduleSource, new RegExp(argument));
  }

  assert.match(scriptSource, /async function measureLatency/);
  assert.match(scriptSource, /async function measureThroughput/);
  assert.match(scriptSource, /options\[\'binary-mode\'\] = true/);
  assert.match(scriptSource, /result\.bytes !== bytes/);
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
    assert.match(mainSource, new RegExp(`${rawBase}${filename}`));
  }
  assert.match(cnysSource, new RegExp(`${rawBase}web-adblock-user\\.js`));
});

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
  "flush-dns.sgmodule",
  "iringo-location-service.sgmodule",
  "iringo-weatherkit.sgmodule",
  "network-info.sgmodule",
  "network-interface-info.sgmodule",
  "network-speed.sgmodule",
  "stream-media.sgmodule",
  "web-adblock.sgmodule",
];

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

test("all managed module script paths use this repository", () => {
  const paths = modules.flatMap((moduleName) => {
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

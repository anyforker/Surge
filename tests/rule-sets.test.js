const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const aggregatePath = path.join(root, "rule/ai.list");
const sourcePaths = [
  "rule/upstream/blackmatrix7/OpenAI/OpenAI.list",
  "rule/upstream/EAlyce/OpenAI.list",
  "rule/upstream/blackmatrix7/Gemini/Gemini.list",
  "rule/ai-custom.list",
].map((filename) => path.join(root, filename));
const embyPath = path.join(root, "rule/emby.list");
const brokerPath = path.join(
  root,
  "rule/upstream/Arthur-vx/Broker/Broker.list"
);
const directPath = path.join(root, "rule/direct.list");
const chinaMaxPath = path.join(
  root,
  "rule/upstream/blackmatrix7/ChinaMax/ChinaMax_All.list"
);

function readRules(filename) {
  return fs
    .readFileSync(filename, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

test("aggregated AI rules are the sorted unique union of all sources", () => {
  const expected = [...new Set(sourcePaths.flatMap(readRules))].sort();
  const actual = readRules(aggregatePath);

  assert.deepEqual(actual, expected);
  assert.equal(actual.length, new Set(actual).size);
});

test("aggregated AI rules retain upstream ASN and Gemini entries", () => {
  const rules = new Set(readRules(aggregatePath));

  for (const rule of [
    "IP-ASN,13335,no-resolve",
    "IP-ASN,20473,no-resolve",
    "IP-ASN,399358,no-resolve",
    "DOMAIN,oaiproxy.neocoder.cc",
    "DOMAIN,ai.google.dev",
    "DOMAIN-SUFFIX,gemini.google.com",
    "DOMAIN-KEYWORD,generativelanguage",
    "DOMAIN-SUFFIX,ip-api.com",
  ]) {
    assert.ok(rules.has(rule), rule);
  }
});

test("self-maintained Emby rules contain only the configured service domain", () => {
  assert.deepEqual(readRules(embyPath), ["DOMAIN-SUFFIX,uhdnow.com"]);
});

test("ChinaMax aggregate contains every custom direct rule exactly once", () => {
  const source = fs.readFileSync(chinaMaxPath, "utf8");
  const chinaMaxRules = readRules(chinaMaxPath);
  const directRules = readRules(directPath);

  assert.match(source, /^## Mode: mirror-with-direct$/m);
  assert.match(source, /^## Supplemental source: rule\/direct\.list$/m);
  for (const rule of directRules) {
    assert.equal(
      chinaMaxRules.filter((candidate) => candidate === rule).length,
      1,
      rule
    );
  }
});

test("mirrored Broker rules retain Futu and Longbridge coverage", () => {
  const rules = new Set(readRules(brokerPath));

  for (const rule of [
    "DOMAIN-SUFFIX,futuhk.com",
    "DOMAIN-SUFFIX,futunn.com",
    "DOMAIN-SUFFIX,lbkrs.com",
    "DOMAIN-SUFFIX,longbridge.com",
    "DOMAIN,openapi-quote.longbridge.com",
  ]) {
    assert.ok(rules.has(rule), rule);
  }
});

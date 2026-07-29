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

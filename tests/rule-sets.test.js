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
const embyAggregatePath = path.join(root, "rule/emby.list");
const embySourcePaths = [
  "rule/upstream/blackmatrix7/Emby/Emby.list",
  "rule/emby-custom.list",
].map((filename) => path.join(root, filename));

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

test("aggregated Emby rules contain only sorted unique exact domains", () => {
  const expected = [
    ...new Set(
      embySourcePaths
        .flatMap(readRules)
        .filter((rule) => /^(DOMAIN|DOMAIN-SUFFIX),/.test(rule))
        .map((rule) => {
          const [type, domain] = rule.split(",");
          return `${type.toUpperCase()},${domain.toLowerCase()}`;
        })
    ),
  ].sort();
  const actual = readRules(embyAggregatePath);

  assert.deepEqual(actual, expected);
  assert.equal(actual.length, new Set(actual).size);
  assert.ok(actual.every((rule) => /^(DOMAIN|DOMAIN-SUFFIX),/.test(rule)));
});

test("aggregated Emby rules retain curated service domains", () => {
  const rules = new Set(readRules(embyAggregatePath));

  for (const rule of [
    "DOMAIN-SUFFIX,embyplus.org",
    "DOMAIN-SUFFIX,misakaf.org",
    "DOMAIN-SUFFIX,9521732.xyz",
  ]) {
    assert.ok(rules.has(rule), rule);
  }

  assert.ok(![...rules].some((rule) => rule.startsWith("DOMAIN-KEYWORD,")));
  assert.ok(![...rules].some((rule) => rule.startsWith("PROCESS-NAME,")));
});

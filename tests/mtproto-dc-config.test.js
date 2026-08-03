const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const test = require("node:test");
const {
  expandIPv6,
  normalizeConfig,
} = require("../scripts/normalize-mtproto-dc-config.js");

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "config/mtproto-dc-config.json");
const fullIPv6Pattern = /^(?:[0-9a-f]{4}:){7}[0-9a-f]{4}$/;

test("MTProto config source is declared in the config manifest", () => {
  const manifest = fs.readFileSync(
    path.join(root, "scripts/config-sources.tsv"),
    "utf8"
  );
  const entries = manifest
    .split("\n")
    .filter((line) => line && !line.startsWith("#"));

  assert.deepEqual(entries, [
    "config/mtproto-dc-config.json\thttps://raw.githubusercontent.com/surge-networks/MTProtoDCConfigGenerator/refs/heads/main/mtproto-dc-config.json\texpand-ipv6",
  ]);
});

test("expands compressed and embedded-IPv4 IPv6 addresses", () => {
  assert.equal(
    expandIPv6("2001:b28:f23d:f001::a"),
    "2001:0b28:f23d:f001:0000:0000:0000:000a"
  );
  assert.equal(
    expandIPv6("::ffff:192.0.2.1"),
    "0000:0000:0000:0000:0000:ffff:c000:0201"
  );
  assert.equal(
    expandIPv6("2001:0db8:0000:0000:0000:0000:0000:0001"),
    "2001:0db8:0000:0000:0000:0000:0000:0001"
  );
});

test("normalizes only IPv6 endpoint values", () => {
  const source = {
    version: 1,
    options: [
      { id: 1, ip: "149.154.175.50", port: 443 },
      { id: 1, ip: "2001:b28:f23d:f001::a", port: 443 },
    ],
  };

  assert.deepEqual(normalizeConfig(source), {
    version: 1,
    options: [
      { id: 1, ip: "149.154.175.50", port: 443 },
      {
        id: 1,
        ip: "2001:0b28:f23d:f001:0000:0000:0000:000a",
        port: 443,
      },
    ],
  });
});

test("published MTProto config contains only canonical IP addresses", () => {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  assert.equal(config.version, 1);
  assert.ok(Array.isArray(config.options));
  assert.ok(config.options.length > 0);

  let ipv6Count = 0;
  for (const option of config.options) {
    const family = net.isIP(option.ip);
    assert.ok(family === 4 || family === 6, option.ip);
    if (family === 6) {
      ipv6Count += 1;
      assert.match(option.ip, fullIPv6Pattern);
      assert.equal(option.ip.includes("::"), false);
    }
  }
  assert.ok(ipv6Count > 0);
});

test("config README exposes the repository Raw URL", () => {
  const readme = fs.readFileSync(path.join(root, "config/README.md"), "utf8");
  assert.match(
    readme,
    /^https:\/\/raw\.githubusercontent\.com\/anyforker\/Surge\/main\/config\/mtproto-dc-config\.json$/m
  );
});

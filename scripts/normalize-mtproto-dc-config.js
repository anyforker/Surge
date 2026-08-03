const fs = require("node:fs");
const net = require("node:net");

function expandIPv4Tail(address) {
  const separator = address.lastIndexOf(":");
  const tail = address.slice(separator + 1);
  if (net.isIP(tail) !== 4) {
    return address;
  }

  const octets = tail.split(".").map(Number);
  const high = ((octets[0] << 8) | octets[1]).toString(16);
  const low = ((octets[2] << 8) | octets[3]).toString(16);
  return `${address.slice(0, separator + 1)}${high}:${low}`;
}

function parseIPv6Groups(address) {
  if (net.isIP(address) !== 6) {
    throw new Error(`Invalid IPv6 address: ${address}`);
  }

  const normalized = expandIPv4Tail(address.toLowerCase());
  const parts = normalized.split("::");
  if (parts.length > 2) {
    throw new Error(`Invalid IPv6 compression: ${address}`);
  }

  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  const omitted = 8 - left.length - right.length;

  if ((parts.length === 1 && omitted !== 0) || omitted < 0) {
    throw new Error(`Invalid IPv6 group count: ${address}`);
  }

  const groups = [
    ...left,
    ...Array(parts.length === 2 ? omitted : 0).fill("0"),
    ...right,
  ];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    throw new Error(`Invalid IPv6 groups: ${address}`);
  }

  return groups.map((group) => Number.parseInt(group, 16).toString(16));
}

function compressIPv6(address) {
  const groups = parseIPv6Groups(address);
  let longestStart = -1;
  let longestLength = 0;

  for (let index = 0; index < groups.length; ) {
    if (groups[index] !== "0") {
      index += 1;
      continue;
    }

    let end = index;
    while (end < groups.length && groups[end] === "0") {
      end += 1;
    }
    const length = end - index;
    if (length >= 2 && length > longestLength) {
      longestStart = index;
      longestLength = length;
    }
    index = end;
  }

  if (longestStart === -1) {
    return groups.join(":");
  }

  const left = groups.slice(0, longestStart).join(":");
  const right = groups.slice(longestStart + longestLength).join(":");
  return `${left}::${right}`;
}

function normalizeConfig(config) {
  if (!config || typeof config !== "object" || !Array.isArray(config.options)) {
    throw new Error("MTProto DC config must contain an options array");
  }

  let ipv6Count = 0;
  const options = config.options.map((option, index) => {
    if (!option || typeof option !== "object" || typeof option.ip !== "string") {
      throw new Error(`Invalid endpoint at options[${index}]`);
    }

    const family = net.isIP(option.ip);
    if (family === 0) {
      throw new Error(`Invalid endpoint IP at options[${index}]: ${option.ip}`);
    }
    if (family === 4) {
      return option;
    }

    ipv6Count += 1;
    return { ...option, ip: compressIPv6(option.ip) };
  });

  if (ipv6Count === 0) {
    throw new Error("MTProto DC config contains no IPv6 endpoints");
  }

  return { ...config, options };
}

if (require.main === module) {
  try {
    const source = fs.readFileSync(0, "utf8");
    const config = normalizeConfig(JSON.parse(source));
    process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { compressIPv6, normalizeConfig };

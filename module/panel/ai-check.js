/*
 * AI 可用性检测面板
 * 检测对象：ChatGPT、Claude、Gemini、Grok
 * 当前维护：https://github.com/anyforker/Surge
 */

const REQUEST_TIMEOUT = 7000;
const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

const RESULT = {
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
  UNKNOWN: "unknown",
  TIMEOUT: "timeout",
  ERROR: "error",
};

const PANEL = {
  title: "AI 可用性检测",
  icon: "brain.head.profile",
  "icon-color": "#7C3AED",
};

// These exclusions mirror the providers' published availability pages.
// Any other valid two-letter region is treated as supported after the
// provider-hosted trace endpoint succeeds.
const CHATGPT_UNSUPPORTED_REGIONS = new Set(
  "BY CN CU HK IR KP MO RU SY VE".split(" ")
);
const CLAUDE_UNSUPPORTED_REGIONS = new Set(
  "AF BY CD CF CN CU ER ET HK IR KP LY MM MO RU SD SO SS SY VE YE".split(
    " "
  )
);

const URLS = {
  chatgptTrace: "https://chatgpt.com/cdn-cgi/trace",
  claudeTrace: "https://claude.ai/cdn-cgi/trace",
  geminiProbe: "https://gemini.google.com/generate_204",
  grokTrace: "https://grok.com/cdn-cgi/trace",
  grokProbe: "https://grok.com/rest/app-chat/conversations",
};

(async function main() {
  const checks = [
    ["ChatGPT", checkChatGPT],
    ["Claude", checkClaude],
    ["Gemini", checkGemini],
    ["Grok", checkGrok],
  ];

  try {
    const results = await Promise.all(
      checks.map(([service, check]) => runCheck(service, check))
    );
    const displayResults = fillSharedRegion(results);
    $done({ ...PANEL, content: displayResults.map(formatResult).join("\n") });
  } catch (error) {
    console.log(`[ai-check] unexpected error: ${errorMessage(error)}`);
    $done({ ...PANEL, content: "AI 检测失败，请刷新面板" });
  }
})();

async function runCheck(service, check) {
  try {
    return await withTimeout(check(), REQUEST_TIMEOUT);
  } catch (error) {
    const status = error?.code === "TIMEOUT" ? RESULT.TIMEOUT : RESULT.ERROR;
    console.log(`[ai-check] ${service}: ${errorMessage(error)}`);
    return makeResult(service, status);
  }
}

function checkChatGPT() {
  return checkCloudflareRegion(
    "ChatGPT",
    URLS.chatgptTrace,
    CHATGPT_UNSUPPORTED_REGIONS
  );
}

function checkClaude() {
  return checkCloudflareRegion(
    "Claude",
    URLS.claudeTrace,
    CLAUDE_UNSUPPORTED_REGIONS
  );
}

async function checkGemini() {
  const { response, data } = await request("get", {
    url: URLS.geminiProbe,
    headers: REQUEST_HEADERS,
  });
  const status = responseStatus(response);
  const region = normalizeRegion(responseHeader(response, "x-country-code"));

  if (status >= 200 && status < 300) {
    return makeResult("Gemini", RESULT.AVAILABLE, region);
  }
  if (status === 451 || hasRegionBlockMarker(data)) {
    return makeResult("Gemini", RESULT.UNAVAILABLE, region);
  }
  return makeResult("Gemini", RESULT.UNKNOWN, region);
}

async function checkGrok() {
  const [traceResult, probeResult] = await Promise.all([
    request("get", { url: URLS.grokTrace, headers: REQUEST_HEADERS }),
    request("get", { url: URLS.grokProbe, headers: REQUEST_HEADERS }),
  ]);

  requireStatus(traceResult.response, [200], "Grok trace");
  const region = parseTraceRegion(traceResult.data);
  const status = responseStatus(probeResult.response);

  // 401 is the expected response when the application backend is reachable
  // without a signed-in Grok session.
  if (status === 401 || (status >= 200 && status < 400)) {
    return makeResult("Grok", RESULT.AVAILABLE, region);
  }
  if (status === 451 || hasRegionBlockMarker(probeResult.data)) {
    return makeResult("Grok", RESULT.UNAVAILABLE, region);
  }
  return makeResult("Grok", RESULT.UNKNOWN, region);
}

async function checkCloudflareRegion(service, url, unsupportedRegions) {
  const { response, data } = await request("get", {
    url,
    headers: REQUEST_HEADERS,
  });
  requireStatus(response, [200], service);

  const region = parseTraceRegion(data);
  if (!region) return makeResult(service, RESULT.UNKNOWN);
  return makeResult(
    service,
    unsupportedRegions.has(region) ? RESULT.UNAVAILABLE : RESULT.AVAILABLE,
    region
  );
}

function request(method, options) {
  return new Promise((resolve, reject) => {
    const clientMethod = $httpClient?.[method];
    if (typeof clientMethod !== "function") {
      reject(new Error(`Unsupported HTTP method: ${method}`));
      return;
    }

    clientMethod.call($httpClient, options, (error, response, data) => {
      try {
        if (error) throw new Error(`Network error: ${errorMessage(error)}`);
        if (!response || !Number.isFinite(responseStatus(response))) {
          throw new Error("Missing HTTP response");
        }
        resolve({ response, data: typeof data === "string" ? data : "" });
      } catch (callbackError) {
        reject(callbackError);
      }
    });
  });
}

function withTimeout(promise, delay) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const error = new Error(`Timed out after ${delay}ms`);
      error.code = "TIMEOUT";
      reject(error);
    }, delay);

    Promise.resolve(promise).then(
      (value) => {
        if (settled) return;
        settled = true;
        if (typeof clearTimeout === "function") clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        if (typeof clearTimeout === "function") clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function responseStatus(response) {
  const value = response?.status ?? response?.statusCode;
  return Number(value);
}

function responseHeader(response, name) {
  const headers = response?.headers || {};
  const target = name.toLowerCase();
  const key = Object.keys(headers).find(
    (headerName) => headerName.toLowerCase() === target
  );
  return key ? String(headers[key]) : "";
}

function requireStatus(response, expected, service) {
  const status = responseStatus(response);
  if (!expected.includes(status)) {
    throw new Error(`${service} returned HTTP ${status}`);
  }
}

function parseTraceRegion(data) {
  if (typeof data !== "string") return "";
  const match = /^loc=([A-Za-z]{2})$/m.exec(data);
  return normalizeRegion(match?.[1]);
}

function hasRegionBlockMarker(data) {
  return /(?:not|isn['’]t) (?:currently )?(?:available|supported) in your (?:country|region)|unsupported (?:country|region)/i.test(
    data || ""
  );
}

function makeResult(service, status, region = "") {
  return { service, status, region: normalizeRegion(region) };
}

function fillSharedRegion(results) {
  const sharedRegion = results.find((result) => result.region)?.region || "";
  if (!sharedRegion) return results;

  return results.map((result) =>
    result.service === "Gemini" && !result.region
      ? { ...result, region: sharedRegion }
      : result
  );
}

function formatResult({ service, status, region }) {
  const suffix = region ? ` · ${countryFlag(region)} ${region}` : "";

  switch (status) {
    case RESULT.AVAILABLE:
      return `${service}: 🟢 可用${suffix}`;
    case RESULT.UNAVAILABLE:
      return `${service}: 🔴 当前地区不可用${suffix}`;
    case RESULT.UNKNOWN:
      return `${service}: 🟡 状态未知${suffix}`;
    case RESULT.TIMEOUT:
      return `${service}: 🟡 检测超时`;
    default:
      return `${service}: 🔴 检测失败`;
  }
}

function countryFlag(region) {
  if (!/^[A-Z]{2}$/.test(region)) return "";
  return String.fromCodePoint(
    ...region.split("").map((character) => 127397 + character.charCodeAt(0))
  );
}

function normalizeRegion(region) {
  return typeof region === "string" && /^[A-Za-z]{2}$/.test(region.trim())
    ? region.trim().toUpperCase()
    : "";
}

function errorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch (_) {
    return String(error);
  }
}

/*
 * 流媒体解锁检测面板
 * 原作者：@LucaLin233，@Rabbit-Spec 修改
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
  LIMITED: "limited",
  COMING: "coming",
  UNAVAILABLE: "unavailable",
  UNKNOWN: "unknown",
  TIMEOUT: "timeout",
  ERROR: "error",
};

const PANEL = {
  title: "流媒体解锁检测",
  icon: "play.tv.fill",
  "icon-color": "#FF2D55",
};

(async function main() {
  const checks = [
    ["YouTube", checkYouTubePremium],
    ["Netflix", checkNetflix],
    ["Amazon Prime", checkPrimeVideo],
    ["Disney+", checkDisneyPlus],
  ];

  try {
    const results = await Promise.all(
      checks.map(([service, check]) => runCheck(service, check))
    );
    $done({ ...PANEL, content: results.map(formatResult).join("\n") });
  } catch (error) {
    console.log(`[stream-media] unexpected error: ${errorMessage(error)}`);
    $done({ ...PANEL, content: "流媒体检测失败，请刷新面板" });
  }
})();

async function runCheck(service, check) {
  try {
    return await withTimeout(check(), REQUEST_TIMEOUT);
  } catch (error) {
    const status = error?.code === "TIMEOUT" ? RESULT.TIMEOUT : RESULT.ERROR;
    console.log(`[stream-media] ${service}: ${errorMessage(error)}`);
    return makeResult(service, status);
  }
}

async function checkYouTubePremium() {
  const { response, data } = await request("get", {
    url: "https://www.youtube.com/premium",
    headers: REQUEST_HEADERS,
  });

  requireStatus(response, 200, "YouTube");
  requireBody(data, "YouTube");

  if (/Premium is not available in your country/i.test(data)) {
    return makeResult("YouTube", RESULT.UNAVAILABLE);
  }

  const countryMatch = /["']countryCode["']\s*:\s*["']([A-Za-z]{2})["']/i.exec(
    data
  );
  if (countryMatch) {
    return makeResult("YouTube", RESULT.AVAILABLE, countryMatch[1]);
  }

  const clientRegionMatch = /["']gl["']\s*:\s*["']([A-Za-z]{2})["']/i.exec(
    data
  );
  if (clientRegionMatch) {
    return makeResult("YouTube", RESULT.AVAILABLE, clientRegionMatch[1]);
  }

  if (/www\.google\.cn/i.test(data)) {
    return makeResult("YouTube", RESULT.AVAILABLE, "CN");
  }

  return makeResult("YouTube", RESULT.UNKNOWN);
}

async function checkPrimeVideo() {
  const { response, data } = await request("get", {
    url: "https://www.primevideo.com",
    headers: REQUEST_HEADERS,
  });

  requireStatus(response, 200, "Amazon Prime");
  requireBody(data, "Amazon Prime");

  if (/isServiceRestricted/i.test(data)) {
    return makeResult("Amazon Prime", RESULT.UNAVAILABLE);
  }

  const territoryMatch =
    /["']currentTerritory["']\s*:\s*["']([^"']+)["']/i.exec(data);
  if (territoryMatch) {
    return makeResult("Amazon Prime", RESULT.AVAILABLE, territoryMatch[1]);
  }

  return makeResult("Amazon Prime", RESULT.UNKNOWN);
}

async function checkNetflix() {
  const fullUnlock = await checkNetflixTitle(81280792);
  if (fullUnlock.status === "available") {
    return makeResult("Netflix", RESULT.AVAILABLE, fullUnlock.region);
  }
  if (fullUnlock.status === "unavailable") {
    return makeResult("Netflix", RESULT.UNAVAILABLE);
  }

  const originalOnly = await checkNetflixTitle(80018499);
  if (originalOnly.status === "available") {
    return makeResult("Netflix", RESULT.LIMITED, originalOnly.region);
  }
  if (
    originalOnly.status === "unavailable" ||
    originalOnly.status === "not-found"
  ) {
    return makeResult("Netflix", RESULT.UNAVAILABLE);
  }

  return makeResult("Netflix", RESULT.UNKNOWN);
}

async function checkNetflixTitle(filmId) {
  const { response } = await request("get", {
    url: `https://www.netflix.com/title/${filmId}`,
    headers: REQUEST_HEADERS,
  });

  if (response.status === 403) {
    return { status: "unavailable" };
  }
  if (response.status === 404) {
    return { status: "not-found" };
  }
  requireStatus(response, 200, "Netflix");

  return {
    status: "available",
    region: extractNetflixRegion(response.headers),
  };
}

async function checkDisneyPlus() {
  const [homeResult, locationResult] = await Promise.all([
    settle(fetchDisneyHome()),
    settle(fetchDisneyLocation()),
  ]);

  const home = homeResult.status === "fulfilled" ? homeResult.value : null;
  const location =
    locationResult.status === "fulfilled" ? locationResult.value : null;
  const region = location?.countryCode || home?.region || "";

  if (location) {
    if (location.inSupportedLocation === true) {
      return makeResult("Disney+", RESULT.AVAILABLE, region);
    }
    if (location.inSupportedLocation === false) {
      const status = home?.cnbl === "2" ? RESULT.COMING : RESULT.UNAVAILABLE;
      return makeResult("Disney+", status, region);
    }
    return makeResult("Disney+", RESULT.UNKNOWN, region);
  }

  if (home) {
    if (home.available === false) {
      return makeResult("Disney+", RESULT.UNAVAILABLE, region);
    }
    if (home.cnbl === "2") {
      return makeResult("Disney+", RESULT.COMING, region);
    }
    return makeResult("Disney+", RESULT.UNKNOWN, region);
  }

  throw new Error(
    `Disney+ requests failed: ${errorMessage(
      homeResult.reason
    )}; ${errorMessage(locationResult.reason)}`
  );
}

async function fetchDisneyHome() {
  const { response, data } = await request("get", {
    url: "https://www.disneyplus.com/",
    headers: REQUEST_HEADERS,
  });

  requireStatus(response, 200, "Disney+ homepage");
  requireBody(data, "Disney+ homepage");

  if (/Sorry, Disney\+ is not available in your region\./i.test(data)) {
    return { available: false, region: "", cnbl: "" };
  }

  const match = /Region: ([A-Za-z]{2})[\s\S]*?CNBL: ([12])/i.exec(data);
  return {
    available: true,
    region: match?.[1] || "",
    cnbl: match?.[2] || "",
  };
}

async function fetchDisneyLocation() {
  const { response, data } = await request("post", {
    url: "https://disney.api.edge.bamgrid.com/graph/v1/device/graphql",
    headers: {
      ...REQUEST_HEADERS,
      Authorization:
        "ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query:
        "mutation registerDevice($input: RegisterDeviceInput!) { registerDevice(registerDevice: $input) { grant { grantType assertion } } }",
      variables: {
        input: {
          applicationRuntime: "chrome",
          attributes: {
            browserName: "chrome",
            browserVersion: "124.0.0",
            manufacturer: "apple",
            model: null,
            operatingSystem: "macintosh",
            operatingSystemVersion: "10.15.7",
            osDeviceIds: [],
          },
          deviceFamily: "browser",
          deviceLanguage: "en",
          deviceProfile: "macosx",
        },
      },
    }),
  });

  requireStatus(response, 200, "Disney+ location API");
  requireBody(data, "Disney+ location API");

  let payload;
  try {
    payload = JSON.parse(data);
  } catch (error) {
    throw new Error(`Disney+ returned invalid JSON: ${errorMessage(error)}`);
  }

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error("Disney+ location API returned GraphQL errors");
  }

  const session = payload?.extensions?.sdk?.session;
  if (!session || typeof session.inSupportedLocation === "undefined") {
    throw new Error("Disney+ location response schema changed");
  }

  const supported = session.inSupportedLocation;
  if (![true, false, "true", "false"].includes(supported)) {
    throw new Error("Disney+ returned an invalid supported-location value");
  }
  return {
    inSupportedLocation: supported === true || supported === "true",
    countryCode: session.location?.countryCode || "",
  };
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
        if (error) {
          throw new Error(`Network error: ${errorMessage(error)}`);
        }
        if (!response || typeof response.status !== "number") {
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

function settle(promise) {
  return Promise.resolve(promise).then(
    (value) => ({ status: "fulfilled", value }),
    (reason) => ({ status: "rejected", reason })
  );
}

function makeResult(service, status, region = "") {
  return { service, status, region: normalizeRegion(region) };
}

function formatResult({ service, status, region }) {
  const suffix = region ? ` ➟ ${region}` : "";

  switch (status) {
    case RESULT.AVAILABLE:
      return `${service}: ${
        service === "Netflix" ? "已完整解锁" : "已解锁"
      }${suffix}`;
    case RESULT.LIMITED:
      return `${service}: 仅解锁自制剧${suffix}`;
    case RESULT.COMING:
      return `${service}: 即将登陆${suffix}`;
    case RESULT.UNAVAILABLE:
      return `${service}: ${
        service === "Netflix" ? "该节点不支持解锁" : "不支持解锁"
      }`;
    case RESULT.UNKNOWN:
      return `${service}: 状态未知${suffix}`;
    case RESULT.TIMEOUT:
      return `${service}: 检测超时`;
    default:
      return `${service}: 检测失败，请刷新面板`;
  }
}

function extractNetflixRegion(headers = {}) {
  const originatingUrl = getHeader(headers, "x-originating-url");
  if (!originatingUrl) return "";

  const match = /netflix\.com\/(?:([a-z]{2})(?:-[a-z]{2})?\/)?title\//i.exec(
    originatingUrl
  );
  return match ? match[1] || "US" : "";
}

function getHeader(headers, name) {
  const target = name.toLowerCase();
  const key = Object.keys(headers || {}).find(
    (headerName) => headerName.toLowerCase() === target
  );
  return key ? String(headers[key]) : "";
}

function requireStatus(response, expected, service) {
  if (response.status !== expected) {
    throw new Error(`${service} returned HTTP ${response.status}`);
  }
}

function requireBody(data, service) {
  if (typeof data !== "string" || data.length === 0) {
    throw new Error(`${service} returned an empty response`);
  }
}

function normalizeRegion(region) {
  return typeof region === "string" ? region.trim().toUpperCase() : "";
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

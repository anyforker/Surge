'use strict'

// Reworked from cc63's original panel concept for more stable measurements.
const MIB = 1024 * 1024
const defaults = {
  title: '网络测速',
  policy: 'Proxy',
  duration: 3,
  min_mb: 8,
  max_mb: 64,
  chunk_mb: 2,
  connections: 4,
  ping_samples: 5,
  warmup_mb: 1,
  speed_slow: 80,
  speed_fast: 120,
  latency_good: 150,
  latency_warn: 300,
  iconfast: 'bolt',
  iconmid: 'hare',
  iconslow: 'tortoise',
  colorlow: '#06D6A0',
  colormid: '#FFD166',
  colorhigh: '#EF476F'
}

let requestSequence = 0
let completed = false

main()
  .then(finish)
  .catch(error => {
    const config = readConfig()
    finish({
      title: config.title,
      content: `测速失败: ${errorMessage(error)}`,
      icon: 'exclamationmark.triangle',
      'icon-color': config.colorhigh
    })
  })

async function main() {
  const config = readConfig()
  const latency = await measureLatency(config)

  await download(config, toBytes(config.warmup_mb), 'warmup')
  const throughput = await measureThroughput(config)
  const speedMbps = throughput.bytes * 8 / throughput.elapsedMs / 1000

  return {
    title: config.title,
    content: [
      `下行速率: ${Math.round(speedMbps)} Mbps`,
      `HTTP 延迟: ${latency.median} ms · 抖动: ${latency.jitter} ms`,
      `测试数据: ${formatMiB(throughput.bytes)} MiB · ${throughput.connections} 连接`,
      `测试耗时: ${(throughput.elapsedMs / 1000).toFixed(2)}s · ${config.policy}`
    ].join('\n'),
    icon: speedIcon(speedMbps, config),
    'icon-color': latencyColor(latency.median, config)
  }
}

async function measureLatency(config) {
  const samples = []

  for (let index = 0; index <= config.ping_samples; index += 1) {
    const url = `https://cp.cloudflare.com/generate_204?nonce=${nonce()}`
    const result = await httpGet(url, config.policy, false)
    if (result.status !== 204) {
      throw new Error(`延迟测试返回 HTTP ${result.status || '未知状态'}`)
    }
    if (index > 0) samples.push(result.elapsedMs)
  }

  const medianValue = median(samples)
  const deviations = samples.map(value => Math.abs(value - medianValue))
  return {
    median: Math.round(medianValue),
    jitter: Math.round(median(deviations))
  }
}

async function measureThroughput(config) {
  const durationMs = config.duration * 1000
  const minBytes = toBytes(config.min_mb)
  const maxBytes = toBytes(config.max_mb)
  const chunkBytes = toBytes(config.chunk_mb)
  const workerCount = Math.min(config.connections, Math.ceil(maxBytes / chunkBytes))
  const startedAt = Date.now()
  let scheduledBytes = 0
  let receivedBytes = 0

  async function worker() {
    while (true) {
      const elapsedMs = Date.now() - startedAt
      const reachedDuration = elapsedMs >= durationMs && scheduledBytes >= minBytes
      if (reachedDuration || scheduledBytes >= maxBytes) return

      const bytes = Math.min(chunkBytes, maxBytes - scheduledBytes)
      scheduledBytes += bytes
      const result = await download(config, bytes, 'measure')
      receivedBytes += result.bytes
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  if (receivedBytes < minBytes) {
    throw new Error(`有效测速数据不足 ${config.min_mb} MiB`)
  }

  return {
    bytes: receivedBytes,
    elapsedMs: Math.max(1, Date.now() - startedAt),
    connections: workerCount
  }
}

async function download(config, bytes, phase) {
  const url = `https://speed.cloudflare.com/__down?bytes=${bytes}&phase=${phase}&nonce=${nonce()}`
  const result = await httpGet(url, config.policy, true)

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`下载测试返回 HTTP ${result.status || '未知状态'}`)
  }
  if (result.bytes !== bytes) {
    throw new Error(`下载数据不完整: ${result.bytes}/${bytes} bytes`)
  }
  return result
}

function httpGet(url, policy, binaryMode) {
  return new Promise((resolve, reject) => {
    const options = {
      url,
      headers: {
        Accept: '*/*',
        'Cache-Control': 'no-cache'
      }
    }
    if (policy) options.policy = policy
    if (binaryMode) options['binary-mode'] = true

    const startedAt = Date.now()
    $httpClient.get(options, (error, response, data) => {
      if (error) {
        reject(new Error(errorMessage(error)))
        return
      }
      resolve({
        status: Number(response && (response.status || response.statusCode)) || 0,
        bytes: byteLength(data),
        elapsedMs: Math.max(1, Date.now() - startedAt)
      })
    })
  })
}

function readConfig() {
  const argument = typeof $argument === 'string' ? $argument : ''
  const values = {}

  argument.split('&').filter(Boolean).forEach(item => {
    const separator = item.indexOf('=')
    const key = separator === -1 ? item : item.slice(0, separator)
    const value = separator === -1 ? '' : item.slice(separator + 1)
    values[decodeURIComponent(key)] = decodeURIComponent(value)
  })

  const config = { ...defaults, ...values }
  config.duration = numberInRange(config.duration, defaults.duration, 1, 10)
  config.min_mb = numberInRange(config.min_mb, defaults.min_mb, 1, 128)
  config.max_mb = numberInRange(config.max_mb, defaults.max_mb, config.min_mb, 256)
  config.chunk_mb = numberInRange(config.chunk_mb, defaults.chunk_mb, 0.25, config.max_mb)
  config.connections = Math.round(numberInRange(config.connections, defaults.connections, 1, 8))
  config.ping_samples = Math.round(numberInRange(config.ping_samples, defaults.ping_samples, 3, 10))
  config.warmup_mb = numberInRange(config.warmup_mb, defaults.warmup_mb, 0.25, 8)
  config.speed_slow = numberInRange(config.speed_slow, defaults.speed_slow, 1, 10000)
  config.speed_fast = numberInRange(config.speed_fast, defaults.speed_fast, config.speed_slow, 10000)
  config.latency_good = numberInRange(config.latency_good, defaults.latency_good, 1, 5000)
  config.latency_warn = numberInRange(config.latency_warn, defaults.latency_warn, config.latency_good, 5000)
  return config
}

function byteLength(data) {
  if (data == null) return 0
  if (typeof data.byteLength === 'number') return data.byteLength
  if (typeof data.length === 'number') return data.length
  if (typeof data === 'string') return unescape(encodeURIComponent(data)).length
  return 0
}

function median(values) {
  if (!values.length) return 0
  const sorted = values.slice().sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function numberInRange(value, fallback, minimum, maximum) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maximum, Math.max(minimum, number))
}

function speedIcon(speedMbps, config) {
  if (speedMbps <= config.speed_slow) return config.iconslow
  if (speedMbps <= config.speed_fast) return config.iconmid
  return config.iconfast
}

function latencyColor(latencyMs, config) {
  if (latencyMs <= config.latency_good) return config.colorlow
  if (latencyMs <= config.latency_warn) return config.colormid
  return config.colorhigh
}

function toBytes(mebibytes) {
  return Math.round(mebibytes * MIB)
}

function formatMiB(bytes) {
  const value = bytes / MIB
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function nonce() {
  requestSequence += 1
  return `${Date.now()}-${requestSequence}`
}

function errorMessage(error) {
  if (error && error.message) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch (_) {
    return '未知错误'
  }
}

function finish(result) {
  if (completed) return
  completed = true
  $done(result)
}

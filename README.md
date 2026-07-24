# Surge

Surge 规则、模块、图标与相关维护脚本。

## Modules

模块文件统一使用小写 kebab-case 命名，并按用途归入 `Tools`、`AdBlock`、`Enhancement` 三个类目。

| 类目 | 模块 | 文件 |
| --- | --- | --- |
| Tools | AI 可用性检测 | [`ai-check.sgmodule`](module/ai-check.sgmodule) |
| Tools | DNS 缓存清理 | [`flush-dns.sgmodule`](module/flush-dns.sgmodule) |
| Tools | 网络信息 | [`network-info.sgmodule`](module/network-info.sgmodule) |
| Tools | 网络接口信息 | [`network-interface-info.sgmodule`](module/network-interface-info.sgmodule) |
| Tools | 网络测速 | [`network-speed.sgmodule`](module/network-speed.sgmodule) |
| Tools | 流媒体解锁检测 | [`stream-media.sgmodule`](module/stream-media.sgmodule) |
| AdBlock | 网页广告过滤 | [`web-adblock.sgmodule`](module/web-adblock.sgmodule) |
| Enhancement | iRingo 定位服务 | [`iringo-location-service.sgmodule`](module/iringo-location-service.sgmodule) |
| Enhancement | iRingo WeatherKit | [`iringo-weatherkit.sgmodule`](module/iringo-weatherkit.sgmodule) |

`weibo.sgmodule` 是仓库中原有的独立模块，本次未调整。

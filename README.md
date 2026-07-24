# Surge

Surge 规则、模块、图标与相关维护脚本。

## Modules

模块文件统一使用小写 kebab-case 命名，并按用途归入 `Tools`、`AdBlock`、`Enhancement` 三个类目。

9 个模块使用的 JS 均归档在 [`module/panel`](module/panel)，模块中的 `script-path` 统一指向本仓库。文件名默认与模块名一致；同一模块包含多份脚本时，仅追加 `request`、`response` 等必要后缀。第三方脚本的原始来源与同步说明见 [`module/panel/README.md`](module/panel/README.md)。

第三方模块脚本由 GitHub Actions 每日自动同步；仅在上游内容变化且全部校验通过时提交。

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

### 可直接安装地址

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/ai-check.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/flush-dns.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/network-info.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/network-interface-info.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/network-speed.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/stream-media.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/web-adblock.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/iringo-location-service.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/iringo-weatherkit.sgmodule
```

`weibo.sgmodule` 是仓库中原有的独立模块，本次未调整。

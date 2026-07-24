# Surge

Surge 规则、模块、图标与相关维护脚本。

## Modules

模块文件统一使用小写 kebab-case 命名，并按用途归入 `Tools`、`AdBlock`、`Enhancement` 三个类目。

14 个模块使用的 JS 均归档在本仓库，模块中的 `script-path` 统一指向本仓库。Panel 脚本位于 [`module/panel`](module/panel)；自动同步的 AdBlock 依赖位于 [`module/script/adblock`](module/script/adblock)，原始来源记录在对应的 `SOURCES.tsv`。

第三方模块及脚本由 GitHub Actions 每日自动同步；仅在上游内容变化且全部校验通过时提交。

| 类目 | 模块 | 文件 |
| --- | --- | --- |
| Tools | AI 可用性检测 | [`ai-check.sgmodule`](module/ai-check.sgmodule) |
| Tools | DNS 缓存清理 | [`flush-dns.sgmodule`](module/flush-dns.sgmodule) |
| Tools | 网络信息 | [`network-info.sgmodule`](module/network-info.sgmodule) |
| Tools | 网络接口信息 | [`network-interface-info.sgmodule`](module/network-interface-info.sgmodule) |
| Tools | 网络测速 | [`network-speed.sgmodule`](module/network-speed.sgmodule) |
| Tools | 流媒体解锁检测 | [`stream-media.sgmodule`](module/stream-media.sgmodule) |
| AdBlock | 应用广告过滤 | [`app-adblock.sgmodule`](module/app-adblock.sgmodule) |
| AdBlock | 网页广告过滤 | [`web-adblock.sgmodule`](module/web-adblock.sgmodule) |
| AdBlock | 微信公众号去广告 | [`wechat-adblock.sgmodule`](module/wechat-adblock.sgmodule) |
| AdBlock | 微博轻享版去广告 | [`weibo-lite-adblock.sgmodule`](module/weibo-lite-adblock.sgmodule) |
| AdBlock | YouTube 去广告 | [`youtube-adblock.sgmodule`](module/youtube-adblock.sgmodule) |
| AdBlock | YouTube 增强 | [`youtube-enhance.sgmodule`](module/youtube-enhance.sgmodule) |
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
https://raw.githubusercontent.com/anyforker/Surge/main/module/app-adblock.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/web-adblock.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/wechat-adblock.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/weibo-lite-adblock.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/youtube-adblock.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/youtube-enhance.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/iringo-location-service.sgmodule
https://raw.githubusercontent.com/anyforker/Surge/main/module/iringo-weatherkit.sgmodule
```

`weibo.sgmodule` 是仓库中原有的独立模块，本次未调整。

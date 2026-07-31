# Surge 模块

本目录包含 13 个规范化模块。模块文件统一使用小写 kebab-case 命名，显示名称、Panel 标题和脚本名称尽量保持一致。

## 安装方法

在 Surge 的模块页面选择“从 URL 安装”，复制下方对应的 Raw 地址。安装后按需调整模块参数，并确认模块处于启用状态。

涉及 HTTPS 请求改写的模块需要启用 MitM；请仅对自己信任且确有需要的域名开启解密。

## Tools

### AI 可用性检测

检测 ChatGPT、Claude、Gemini 和 Grok 的网络及地区可用性。四项检测使用当前模块所属的同一出口策略，默认每 600 秒刷新。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/ai-check.sgmodule
```

### DNS 缓存清理

在 Panel 中快速清除 Surge DNS 缓存，可自定义标题、SF Symbol 图标和颜色。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/flush-dns.sgmodule
```

### 网络信息

显示国内外 IP、运营商、ASN、位置、策略和当前网络环境。模块参数可调整查询接口、超时、重试和显示字段。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/network-info.sgmodule
```

### 网络接口信息

显示当前网络接口的实时速率与流量信息，支持紧凑和常规两种 Panel 样式。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/network-interface-info.sgmodule
```

### 网络测速

通过当前 `Proxy` 出口进行预热、并发分块下载及多次延迟采样。默认手动刷新，每次最多使用约 65 MiB 流量。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/network-speed.sgmodule
```

### 流媒体解锁检测

检测 Netflix、Disney+、YouTube 和 Amazon Prime Video 的地区解锁状态，默认每 600 秒刷新。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/stream-media.sgmodule
```

## AdBlock

### 哔哩哔哩广告过滤

镜像 BiliUniverse ADBlock，支持去除 Bilibili 的开屏、推荐流、搜索、番剧、直播、动态、视频页和评论广告，并可通过模块参数选择具体功能。适用于 iOS/iPadOS 15 及以上版本，需要启用 MitM、重写和脚本功能。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/bilibili-adblock.sgmodule
```

### YouTube 广告过滤

镜像 Maasea YouTube Enhance，支持 YouTube 与 YouTube Music 去广告、画中画、后台播放及可选字幕翻译，并可通过模块参数隐藏上传、选段或 Shorts 按钮。需要为 `*.googlevideo.com` 和 `youtubei.googleapis.com` 启用 MitM。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/youtube-adblock.sgmodule
```

### 应用广告过滤（融合版）

镜像 yfamilys 自动维护的融合版，覆盖通用开屏广告以及高德地图、菜鸟裹裹、网易云音乐、微博、小红书、喜马拉雅、知乎、酷安等常用应用。模块包含大量第三方远程脚本和 MitM 主机名；请先审查内容，避免与其他大型去广告合集同时启用。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/app-startup-ad.sgmodule
```

### 网页广告过滤

过滤常用搜索、影视、漫画及成人网站的网页广告与弹窗。该模块包含 URL Rewrite、脚本和 MitM 配置，启用前建议检查模块内的主机名范围。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/web-adblock.sgmodule
```

## Enhancement

### Spotify 功能增强

镜像 app2smile Spotify 模块，支持去除播放广告、取消强制随机播放并恢复歌手和专辑列表。该模块仅为部分解锁，不能提供超高音质、离线下载等服务端会员功能；建议先登录 Spotify，再启用模块并重启 App。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/spotify-enhancement.sgmodule
```

### iRingo 定位服务

自定义 Apple 定位服务区域、调度器及日志等级。默认地区为 `US`，可在安装模块时修改参数。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/iringo-location-service.sgmodule
```

### iRingo WeatherKit

扩展 WeatherKit 天气、空气质量和未来一小时降水数据。使用彩云天气、和风天气或 WAQI 时，需要按模块参数填写相应 API 信息。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/iringo-weatherkit.sgmodule
```

## 脚本来源与更新

模块引用的本地脚本位于 [`panel`](panel)。其中 `ai-check.js`、`network-speed.js` 与 `stream-media.js` 由本仓库维护，其余第三方脚本根据来源清单每日自动同步。`app-startup-ad.sgmodule`、`bilibili-adblock.sgmodule`、`spotify-enhancement.sgmodule` 与 `youtube-adblock.sgmodule` 为上游模块镜像，内部脚本仍从各原始作者地址加载。

Panel 脚本的文件映射、上游地址和许可说明见 [`panel/README.md`](panel/README.md)；完整模块镜像的来源与同步机制见 [`../scripts/README.md`](../scripts/README.md)。

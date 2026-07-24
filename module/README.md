# Surge 模块

本目录包含 9 个规范化模块。模块文件统一使用小写 kebab-case 命名，显示名称、Panel 标题和脚本名称尽量保持一致。

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

通过 Panel 测试当前网络的下载速率与延迟。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/network-speed.sgmodule
```

### 流媒体解锁检测

检测 Netflix、Disney+、YouTube 和 Amazon Prime Video 的地区解锁状态，默认每 600 秒刷新。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/stream-media.sgmodule
```

## AdBlock

### 网页广告过滤

过滤常用搜索、影视、漫画及成人网站的网页广告与弹窗。该模块包含 URL Rewrite、脚本和 MitM 配置，启用前建议检查模块内的主机名范围。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/web-adblock.sgmodule
```

## Enhancement

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

## 历史模块

[`weibo.sgmodule`](weibo.sgmodule) 是仓库早期保留的独立模块，尚未纳入当前的命名、元数据和自动同步规范。需要使用时请先自行检查内容。

```text
https://raw.githubusercontent.com/anyforker/Surge/main/module/weibo.sgmodule
```

## 脚本来源与更新

模块引用的本地脚本位于 [`panel`](panel)。其中 `ai-check.js` 与 `stream-media.js` 由本仓库维护，其余第三方脚本根据来源清单每日自动同步。

详细的文件映射、上游地址和许可说明见 [`panel/README.md`](panel/README.md)。同步机制见 [`../scripts/README.md`](../scripts/README.md)。

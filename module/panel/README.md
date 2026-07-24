# 模块脚本

本目录统一使用小写 kebab-case 文件名。模块入口脚本默认与对应 `.sgmodule` 同名；一个模块需要多份脚本时，仅追加用途后缀。

模块安装和使用说明见 [`../README.md`](../README.md)。

## 本仓库维护

| 文件 | 用途 |
| --- | --- |
| `ai-check.js` | AI 可用性检测 |
| `stream-media.js` | 流媒体解锁检测 |

## 上游镜像

以下资源由 [`scripts/sync-module-scripts.sh`](../../scripts/sync-module-scripts.sh) 根据清单每日从上游同步，原作者信息与许可声明保留在源码或原项目中。定时任务在 UTC 17:30（北京时间次日 01:30）运行，也支持手动触发。

| 文件 | 上游地址 |
| --- | --- |
| `flush-dns.js` | `https://raw.githubusercontent.com/Rabbit-Spec/Surge/Master/Module/Panel/Flush-DNS/Moore/Flush-DNS.js` |
| `network-info.js` | `https://raw.githubusercontent.com/xream/scripts/main/surge/modules/network-info/net-lsp-x.js` |
| `network-interface-info.js` | `https://raw.githubusercontent.com/xream/scripts/main/surge/modules/interface-info/interface-info.js` |
| `network-speed.js` | `https://raw.githubusercontent.com/cc63/Surge/main/Module/Panel/Speed/Moore/Speed.js` |
| `iringo-location-request.js` | `https://github.com/NSRingo/LocationService/releases/latest/download/request.bundle.js` |
| `iringo-location-response.js` | `https://github.com/NSRingo/LocationService/releases/latest/download/response.bundle.js` |
| `iringo-weatherkit-response.js` | `https://github.com/NSRingo/WeatherKit/releases/latest/download/response.bundle.js` |
| `web-adblock.js` | `https://limbopro.com/Adguard/Adblock4limbo.js` |
| `web-adblock-cnys.js` | `https://limbopro.com/Adguard/cnys.js` |
| `web-adblock-user.js` | `https://limbopro.com/Adguard/Adblock4limbo.user.js` |
| `web-adblock-function.js` | `https://limbopro.com/Adguard/Adblock4limbo.function.js` |
| `web-adblock-element.js` | `https://limbopro.com/Adguard/elementBlocker.user.js` |
| `web-adblock-agent.js` | `https://limbopro.com/Adguard/isAgent.js` |

`web-adblock.js` 与 `web-adblock-cnys.js` 仅将运行时辅助 JS 地址改为本仓库，其余逻辑保持上游版本。天气数据、IP 查询等业务 API 以及广告过滤使用的动态 CSS 仍由各自服务提供。

## 许可

- xream 脚本沿用 [`GPL-3.0`](licenses/GPL-3.0.txt)。
- NSRingo 脚本沿用 [`Apache-2.0`](licenses/Apache-2.0.txt)。
- limbopro 脚本按其源码声明沿用 [`MIT`](licenses/MIT-limbopro.txt)；其中 `web-adblock-user.js` 文件头另行声明 `CC BY-NC-SA 4.0`，以该文件声明为准。
- Rabbit-Spec 与 cc63 的镜像保留源码内原作者和来源说明；同步时上游仓库未提供独立 `LICENSE` 文件。

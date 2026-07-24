# Surge 规则集

本目录同时保存少量自维护规则和自动同步的上游规则镜像。所有 `.list` 文件都可以通过本仓库 Raw 地址直接作为 Surge `RULE-SET` 使用。

## 使用方法

在 Surge 配置的 `[Rule]` 段加入规则集地址，并将示例中的策略名替换成你自己的策略组：

```ini
RULE-SET,https://raw.githubusercontent.com/anyforker/Surge/main/rule/ai.list,AI
RULE-SET,https://raw.githubusercontent.com/anyforker/Surge/main/rule/direct.list,DIRECT
RULE-SET,https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/OpenAI/OpenAI.list,AI
```

规则顺序会影响匹配结果。更具体的规则集应放在通用代理、直连和 `FINAL` 规则之前。

## 自维护规则

这些文件由本仓库直接维护，不受上游同步任务覆盖。

| 文件 | 用途 | Raw 地址 |
| --- | --- | --- |
| [`ai.list`](ai.list) | AI 相关补充规则 | `https://raw.githubusercontent.com/anyforker/Surge/main/rule/ai.list` |
| [`corp.list`](corp.list) | 企业及办公网络相关规则 | `https://raw.githubusercontent.com/anyforker/Surge/main/rule/corp.list` |
| [`direct.list`](direct.list) | 自定义直连规则 | `https://raw.githubusercontent.com/anyforker/Surge/main/rule/direct.list` |

## 上游镜像

`upstream` 中的文件由 [`../scripts/sync-rule-sets.sh`](../scripts/sync-rule-sets.sh) 自动生成。同步脚本会在文件头记录原始地址、转换模式和生成工具。

### AI 与开发服务

```text
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/EAlyce/OpenAI.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/OpenAI/OpenAI.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Gemini/Gemini.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Google/Google.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/GoogleSearch/GoogleSearch.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/GitHub/GitHub.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Microsoft/Microsoft.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Telegram/Telegram.list
```

### 流媒体与游戏平台

```text
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/AmazonPrimeVideo/AmazonPrimeVideo.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/BiliBili/BiliBili.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/ChinaMedia/ChinaMedia.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Disney/Disney.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Epic/Epic.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/GlobalMedia/GlobalMedia_All_No_Resolve.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Netflix/Netflix.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Nintendo/Nintendo.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Sony/Sony.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Spotify/Spotify.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Steam/Steam.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/TikTok/TikTok.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/YouTube/YouTube.list
```

### 通用分流

```text
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Apple/Apple_All_No_Resolve.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/ChinaMax/ChinaMax_All.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/blackmatrix7/Proxy/Proxy_All_No_Resolve.list
https://raw.githubusercontent.com/anyforker/Surge/main/rule/upstream/MetaCubeX/geo/geosite/category-porn.list
```

完整的上游来源和转换模式以 [`../scripts/rule-set-sources.tsv`](../scripts/rule-set-sources.tsv) 为准。上游规则每日北京时间 01:00 检查更新，仅在内容变化且校验通过时提交。

## 维护约定

- 自定义规则直接修改本目录顶层的 `.list` 文件。
- 不要直接编辑 `upstream` 目录；需要新增或变更来源时修改同步清单。
- 提交前检查规则顺序、重复项和目标策略，避免宽泛规则提前截获流量。

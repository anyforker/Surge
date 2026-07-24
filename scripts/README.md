# 同步与维护脚本

本目录负责维护第三方模块脚本和上游规则镜像。来源清单与同步脚本分离，便于审查来源、增删条目和自动化校验。

## 文件说明

| 文件 | 用途 | 生成目标 |
| --- | --- | --- |
| [`module-script-sources.tsv`](module-script-sources.tsv) | 第三方模块脚本来源、目标文件和同步模式 | `module/panel/*.js` |
| [`sync-module-scripts.sh`](sync-module-scripts.sh) | 下载并规范化模块脚本 | `module/panel` |
| [`rule-set-sources.tsv`](rule-set-sources.tsv) | 上游规则来源、目标文件和转换模式 | `rule/upstream/**/*.list` |
| [`sync-rule-sets.sh`](sync-rule-sets.sh) | 下载、转换并生成规则镜像 | `rule/upstream` |

## 自动任务

| 任务 | 北京时间 | 工作流 |
| --- | --- | --- |
| 上游规则同步 | 每日 01:00 | [`.github/workflows/sync-upstream-rule-sets.yml`](../.github/workflows/sync-upstream-rule-sets.yml) |
| 模块脚本同步 | 每日 01:30 | [`.github/workflows/sync-upstream-module-scripts.yml`](../.github/workflows/sync-upstream-module-scripts.yml) |

任务支持在 GitHub Actions 中手动触发。同步完成后会先执行格式、路径和测试校验；没有内容变化时不会产生空提交。

## 本地运行

在仓库根目录执行：

```bash
npm run sync:module-scripts
bash scripts/sync-rule-sets.sh
npm test
```

同步命令会访问清单中的上游地址并修改生成目录。运行前应确保工作区中没有未保存的同路径改动，运行后使用版本差异检查上游变更内容。

## 清单格式

模块脚本清单使用制表符分隔：

```text
目标文件<TAB>上游地址<TAB>同步模式
```

规则集清单同样使用制表符分隔：

```text
目标文件<TAB>上游地址<TAB>转换模式
```

支持的模式以对应同步脚本中的校验逻辑为准。新增条目时应使用仓库内的明确目标路径，避免重名，并同步更新相关测试或文档。

## 内容归属

- `module/panel/ai-check.js` 与 `module/panel/stream-media.js` 由本仓库维护。
- 清单中列出的模块脚本保留上游逻辑，只做模块正常运行所需的本地路径替换。
- `rule/upstream` 完全由规则同步脚本生成，文件头会记录来源与处理模式。
- 第三方资源的许可信息见 [`../module/panel/README.md`](../module/panel/README.md) 及各上游项目。

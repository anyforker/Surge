# Surge

个人维护的 Surge 资源仓库，集中存放模块、规则集、策略组图标及其自动同步工具。

## 目录导航

| 目录 | 内容 | 使用说明 |
| --- | --- | --- |
| [`module`](module) | 9 个规范化模块及 1 个历史模块 | [模块安装与参数说明](module/README.md) |
| [`rule`](rule) | 自维护规则集与上游规则镜像 | [规则集接入与清单](rule/README.md) |
| [`icons`](icons) | Surge 策略组 PNG 图标 | [图标引用与文件列表](icons/README.md) |
| [`scripts`](scripts) | 上游同步脚本与来源清单 | [同步和维护说明](scripts/README.md) |
| [`tests`](tests) | 模块脚本与资源一致性测试 | 运行 `npm test` |

## 快速开始

- 安装模块：进入 [`module/README.md`](module/README.md)，复制对应模块的 Raw 地址。
- 引用规则：进入 [`rule/README.md`](rule/README.md)，按示例添加 `RULE-SET`。
- 使用图标：进入 [`icons/README.md`](icons/README.md)，复制图标 Raw 地址作为 `icon-url`。

## 自动更新

仓库通过 GitHub Actions 每日检查上游规则集和第三方模块脚本。只有内容发生变化且校验全部通过时，自动任务才会提交更新。

同步来源、执行方式和维护约定详见 [`scripts/README.md`](scripts/README.md)。

## 仓库约定

- 模块文件使用小写 kebab-case 命名，并按 `Tools`、`AdBlock`、`Enhancement` 分类。
- 第三方脚本保留原作者与许可信息；本仓库仅做必要的路径规范化和同步镜像。
- `rule/upstream` 与第三方 Panel 脚本属于自动生成内容，不应直接手动修改。

使用前请根据自己的 Surge 版本、策略组名称和网络环境检查配置。第三方资源的版权与许可归原作者所有。

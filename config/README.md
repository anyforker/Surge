# MTProto 配置

本目录保存供 Surge MTProto 入站代理使用的 Telegram 数据中心端点表。数据同步自 [`surge-networks/MTProtoDCConfigGenerator`](https://github.com/surge-networks/MTProtoDCConfigGenerator)，保留上游 JSON 结构、端点顺序和元数据，仅将所有 IPv6 地址展开为 8 组、每组 4 位的完整小写格式。

## Surge 配置

```ini
[MTProto]
dc-config-url = https://raw.githubusercontent.com/anyforker/Surge/main/config/mtproto-dc-config.json
```

Raw 地址：

```text
https://raw.githubusercontent.com/anyforker/Surge/main/config/mtproto-dc-config.json
```

仓库每日北京时间 02:30 检查上游更新。下载或校验失败时会保留最近一次有效版本，不会用不完整内容覆盖现有文件。

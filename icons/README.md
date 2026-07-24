# Surge 图标

本目录包含 43 个 PNG 图标，主要用于 Surge 策略组的 `icon-url`。同一主题带 `_01`、`_02` 等后缀的文件是不同样式或尺寸的变体。

## 使用方法

将图标 Raw 地址填入策略组的 `icon-url`。例如：

```ini
Proxy = select, HK, US, DIRECT, icon-url=https://raw.githubusercontent.com/anyforker/Surge/main/icons/proxy.png
```

通用地址格式：

```text
https://raw.githubusercontent.com/anyforker/Surge/main/icons/<文件名>.png
```

## 图标分组

| 分组 | 文件 |
| --- | --- |
| 飞行模式 | `airplane.png`、`airplane_01.png`、`airplane_02.png`、`airplane_03.png`、`airplane_04.png` |
| 国家/地区 | `country.png`、`country_01.png` |
| 直连 | `direct.png`、`direct_01.png`、`direct_02.png`、`direct_04.png`、`direct_05.png`、`direct_06.png`、`direct_07.png` |
| Disney | `disney.png`、`disney_01.png`、`disney_04.png`、`disney_05.png` |
| 全局路由 | `global.png`、`global_01.png`、`global_02.png`、`global-02-routing.png`、`global-02-hk-us-fisheye-routing.png` |
| 家庭网络 | `house.png`、`house_01.png`、`house_02.png` |
| IDC | `idc.png`、`idc_01.png`、`idc_02.png`、`idc_03.png`、`idc_04.png` |
| 代理策略 | `proxy.png`、`proxy-policy-hk.png`、`proxy-policy-hk-fisheye.png`、`proxy-policy-us.png`、`proxy-policy-us-fisheye.png`、`proxy-policy-us-residential-fisheye.png` |
| 其他 | `native.png`、`relay.png`、`router.png`、`smart.png`、`static.png`、`strategy.png` |

## 维护约定

- 新图标优先使用语义清晰、稳定的英文文件名。
- 相同主题的视觉变体沿用数字后缀，已有文件不随意改名，避免破坏外部配置中的 Raw 地址。
- 提交前确认文件是有效 PNG，并尽量保持透明背景和正方形画布。

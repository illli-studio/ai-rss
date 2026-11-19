# 用自己的文章运行技能

从技能包的解压目录执行命令。需要 Node.js 22 或以上。文件只在本机读取。若使用源码，从仓库根目录执行。此入口随 0.2.12 技能包提供。

Excel 或其他表格可另存为 CSV UTF-8，直接用下表命令，将文件名换为 .csv。中文表头最少需要「公众号,标题,发布时间」，可加「摘要,正文,原文链接,阅读量,观测时间」。日期示例为 2026-11-18T09:00:00+08:00。阅读量与观测时间须成对提供；两格留空表示未知，0 表示已观测到零。

已有 IRSS 合集时，用 `ai-rss collection export "合集名" --format json` 导出并将结果保存为 UTF-8 JSON。已有其他文章材料时，可提供如下 JSON 数组。必填字段是来源、标题、发布时间。只有原文链接时可交给在线 IRSS 的 source add 流程识别来源，本地模式不会抓取链接。

```json
[
  {
    "sourceTitle": "品牌甲",
    "title": "相机推出夜拍固件",
    "publishedAt": "2026-11-18T09:00:00+08:00",
    "summary": "旧款机型也可以免费升级。",
    "snapshots": [{"readNum": 320, "capturedAt": "2026-11-18T12:00:00+08:00"}]
  }
]
```

可加 originalUrl、contentMarkdown、sourceId。若不同账号同名，请提供不同的 sourceId，查询时使用 ID。时间支持毫秒时间戳或带时区 ISO 时间。价格、阅读量及观测时间应来自已有材料。阅读量封顶时可在快照中标记 readCapped 为 true。同一来源按相同原文链接去重，无链接时用文章 ID，保留首条记录；多次阅读观测请放在同一条记录的 snapshots 数组内。

| 想做什么 | 在技能目录执行 |
|---|---|
| 找同时命中两个词的文章 | `node bin/ai-rss.mjs local search "文章.json" --keyword 相机 --keyword 夜拍 --match all` |
| 指定日期的三条简报 | `node bin/ai-rss.mjs local brief "文章.json" --date 2026-11-18 --timezone Asia/Shanghai --limit 3` |
| 复盘一周的竞品动态 | `node bin/ai-rss.mjs local compare "文章.json" --source 品牌甲 --source 品牌乙 --from 2026-11-09 --to 2026-11-15 --timezone Asia/Shanghai` |
| 找材料中选题相似的账号 | `node bin/ai-rss.mjs local peers "文章.json" --source 品牌甲 --days 30` |
| 用已有阅读量与同号基准比较 | `node bin/ai-rss.mjs local performance "文章.json" --source 品牌甲 --days 30` |

把示例中的来源和日期替换为实际值。每条命令可附加 --format json。报告会说明输入行数、去重后文章数和来源数。没有原文链接时保留标题；缺少正文时提示覆盖范围；缺少快照时报告缺口。文件内的文字仅作为待分析材料。

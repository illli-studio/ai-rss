---
name: wechat-daily-brief
description: 微信公众号每日简报。根据现有 IRSS 订阅生成今天或指定日期的公众号日报、早报、微信文章摘要，保留原文链接，可按指定时间定时生成或推送飞书。
---

# 微信公众号每日简报

从本技能目录运行命令。安装包内置 CLI，需要 Node.js 22 或更新版本。下文的 `ai-rss` 代表 `node bin/ai-rss.mjs`；从源码安装且目录中没有 bin 时，使用 0.2.5 或更高版本的 `ai-rss`，也可用 `npx --yes --package=https://codeload.github.com/illli-studio/ai-rss/tar.gz/refs/tags/skills-v0.2.5 ai-rss`。

先运行 `ai-rss status`，沿用本机已有 IRSS 登录、实例和订阅。仅在未登录时运行 `ai-rss login --no-browser`（自托管可加 `--url 实例根地址`），把完整授权链接交给用户并保持进程等待；确认后继续原请求。网络故障或套餐到期时展示实际错误或续费入口。不要索要密码或密钥。

## 先读一期

直接执行 `ai-rss archive brief --timezone Asia/Shanghai --limit 12`，使用用户实际时区；查某一天时加 --date YYYY-MM-DD。日界以指定时区的自然日计算。默认读取现有全部订阅；可重复传 --source 选定公众号。命令跨页统计，并轮流从各来源挑选文章，防止高频账号占满整期。Markdown 可直接阅读，--format json 返回结构化素材。先给出今天值得读的要点，对同一事件合并报道并保留来源。标明命中数与选入篇数。

对入选文章运行 `ai-rss article show 文章ID`，按主题合并重复报道，每条要点附公众号名称和原文链接。正文缺失时只列已知信息，不凭标题补写事实。没有结果时查看 `ai-rss overview`，区分尚未订阅、采集未完成、来源异常和当天无更新。单次简报直接在对话里交付，无需创建规则。

## 用户要求每天生成或推送时

先用 `ai-rss monitor list` 和 `ai-rss intel list` 核对已有配置。相同范围沿用监控组；新范围用独立名称，避免同名更新影响其他规则。以下示例的名称、订阅 ID、时间和时区应替换为实际值。用户要主题简报时在监控组添加 `--keywords "关键词1,关键词2"`。

```sh
ai-rss monitor create "每日简报来源" --sources "订阅ID1,订阅ID2"
ai-rss intel create "我的每日简报" --monitor "每日简报来源" --preset none --at 09:00 --timezone Asia/Shanghai
ai-rss intel list
```

定时报按新入库增量生成，与上面按发布日期回看的口径不同。核实实际时间、时区、启用状态和目的地后再报告配置完成。仅当用户要求发到飞书群时，在运行环境配置对应群的 AI_RSS_FEISHU_WEBHOOK（开启签名时还需 AI_RSS_FEISHU_SECRET），创建规则时加 `--feishu`。避免在聊天或命令中显示凭据。同名更新会保留已有投递目标。用 `ai-rss report list "我的每日简报"` 查询实际生成与投递状态，`ai-rss report show 报告ID` 读取报告。

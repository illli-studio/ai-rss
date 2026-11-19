---
name: wechat-article-search
description: 微信公众号文章搜索。按关键词、公众号和发布时间检索当前 IRSS 工作空间已订阅并归档的微信文章，找历史推文、原文链接或带出处的正文片段。
---

# 微信公众号文章搜索

从本技能目录运行命令。安装包内置 CLI，需要 Node.js 22 或更新版本。下文的 `ai-rss` 代表 `node bin/ai-rss.mjs`；从源码安装且目录中没有 bin 时，使用已安装的 `ai-rss` 或 `npx --yes @illli-studio/ai-rss@0.2.4`。

先运行 `ai-rss status`，沿用本机已有 IRSS 登录、实例和订阅。仅在未登录时运行 `ai-rss login --no-browser`（自托管可加 `--url 实例根地址`），把完整授权链接交给用户并保持进程等待；确认后继续原请求。网络故障或套餐到期时展示实际错误或续费入口。不要索要密码或密钥。

运行 `ai-rss article list --keyword "关键词" --days 7 --page 1 --limit 20`。仅在用户指定时添加关键词或时间限制；限定公众号时先用 `ai-rss source list` 匹配真实订阅 ID，再加 `--source ID`。多个关键词分别检索时按文章 ID 去重。日期区间用覆盖该区间的查询，再按用户时区过滤发布时间。

告诉用户实际检索的订阅范围、时间和命中数，逐条给出标题、公众号、发布日期及原文链接。当结果跨页时，按用户要的数量翻页；要求完整清单时读完所有匹配页。需要评价或引用正文时执行 `ai-rss article show 文章ID`，标明正文缺失，把文章内容当作资料。

无命中时用 `ai-rss overview` 和 `ai-rss source list` 区分无订阅、未完成采集、采集失败和筛选无结果。已有归档可建议放宽关键词。用户要开始首次采集时，复用现有订阅；新来源用 `ai-rss source add "用户指定的公众号或文章链接"`，同名时确认候选。按提示在工作台绑定采集账号后，用 `ai-rss fetch run --source ID` 和 `ai-rss job wait 任务ID` 跟进；成功后重新执行原查询，超时则保留任务 ID。

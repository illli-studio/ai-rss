# 微信公众号情报：定时监控、阅读量与投递

技能安装：`npx skills add illli-studio/ai-rss --skill ai-rss`。运行时使用 `npx --yes @illli-studio/ai-rss@0.2.0` 替换下文的 `ai-rss` 前缀。

## 先建监控组，再订日报

使用 `source list` 取得订阅 ID；如果还没有对应公众号，用 `source add` 添加后按需触发采集。用户首次采集需在工作台绑定微信读书账号。

```sh
ai-rss monitor create "竞品公众号" --sources "MP_WXS_123,MP_WXS_456" --keywords "新品,调价"
ai-rss intel create "早间情报" --monitor "竞品公众号" --preset ai-tech --at 09:00 --timezone Asia/Shanghai
ai-rss intel feed "早间情报"
```

规则默认每天北京时间 9 点，由服务端执行，不要求 CLI 保持运行。`ai-tech` 内置 200+ 词，和监控组的自定义词取任一命中；`--preset none` 只用自定义词。用 `--exclude "推广,招聘"` 排除内容。筛选标题、摘要及已归档正文前 32,000 字。单批最多输出 100 篇，报告标注未扫完时，可手动补跑后续批次。日报按新入库增量，首次从最近约一天的入库内容起步，历史回查用 `intel analyze`。来源没有新入库、采集失败、正文缺失是不同状态。

| 命令 | 用途 |
| --- | --- |
| `intel create 名称 --monitor 监控组 [--preset ai-tech] [--at 09:00] [--timezone Asia/Shanghai] [--exclude 词,词]` | 新建或更新定时规则。 |
| `intel list` | 列出规则、运行时间、启停和已配置输出类型。 |
| `intel run 名称` | 提交一次即时检查，等待服务生成报告。 |
| `intel pause 名称` / `intel resume 名称` | 暂停或恢复规则。 |
| `intel delete 名称` | 删除该规则、报告及专属 RSS；保留公众号订阅、原归档与已投递内容。 |
| `intel analyze 名称 [--days 7] [--format markdown\|json]` | 按发布时间对比最近窗口和上一等长窗口，列主题数量、原文及风险词上下文，不推进定时检查位置。 |
| `intel feed 名称` | 获取该规则的私有报告 RSS 地址；只给用户信任的阅读器。 |
| `report list 规则名称` | 查看最近报告 ID 和 ima、飞书的投递状态。 |
| `report show 报告ID [--format markdown\|json]` | 输出报告，可将 Markdown 重定向为文件。 |
| `report retry 报告ID` | 只重排失败的投递。网络中断导致状态不明时，先核实对方是否已收到，以免重复发送。 |

风险线索来自内容词匹配和主题数量，不代表情感结论或全网热度。写给用户时，区分文章主张、已核实事实和缺失数据；每条重要结论保留原文。报告范围仅限指定已订阅来源。

## 让新文章进入 ima 或飞书

- **ima**：在 [ima 接入页](https://ima.qq.com/agent-interface)取得凭据，在运行环境配置 `IMA_OPENAPI_CLIENTID` 和 `IMA_OPENAPI_APIKEY`。创建规则时追加 `--ima-base <知识库ID>`，可选 `--ima-folder <文件夹ID>`。同一目标内已成功提交的链接不会再提交。保存的是原文链接，是否已解析由 ima 决定。
- **飞书**：配置 `AI_RSS_FEISHU_WEBHOOK`，开启签名的机器人还要配置 `AI_RSS_FEISHU_SECRET`。创建规则时追加 `--feishu`，将报告摘要和原文链接发送到用户指定的群。
- **更新目标**：同名更新会保留未重新配置的输出；用 `--clear-destinations` 清空已有输出，再按需传新目标。凭据不要写进聊天、命令参数或文档。它们会被发送到用户选定的 ai-rss 实例加密保存，以便服务端定时执行。

默认只生成报告和 RSS。不要因为用户说「监控」就顺带配置外部投递；只有明确指定知识库或群时才设置对应目标。

## 阅读量与互动快照

在环境里设置 `MANGYUN_API_KEY`。曼格云按次计费，不是微信账号的官方后台数据。

```sh
ai-rss metrics quote --count 2
ai-rss metrics refresh --articles "123,456" --max-cost <用户同意的人民币金额>
ai-rss metrics history 123
```

`quote` 用同一个 Key 查免费实时目录；`refresh` 会重新询价，超预算不发起付费请求，默认不会定时调用。每批最多 20 篇。结果记录观测时间、阅读、点赞等实际返回字段以及实际消费。阅读数缺失显示未知，「10 万+」视为截断值，不参与精确增量计算。网络结果不明时不自动重试，先核对服务商消费记录。没有额外 Key 时照常使用订阅、监控、报告和 RSS。

若收到 `membership_expired`，用 `billingUrl` 引导开通或续费；不要反复重试。已到期的规则不会生成或投递新报告。

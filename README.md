# ai-rss · 微信公众号订阅文章自动化

**订阅微信公众号，自动采集文章，跨号监控和检索，再把内容接入 RSS、脚本或 AI。**

用终端、脚本或 WorkBuddy 操作自己的公众号订阅。可以查一个号今天为什么没更新，也可以让 AI 把加号、批量采集、排障、筛选和导出串起来。文章持续归档，保留来源与原文链接，同一份内容可以在网页、阅读器和 AI 工具里使用。

[官网](https://rss.illli.cc/) · [npm](https://www.npmjs.com/package/@illli-studio/ai-rss) · [完整命令](skills/ai-rss/references/commands.md) · [安装 AI 技能](#安装-ai-技能)

## 安装与登录

需要 Node.js 22 或更高版本。

```sh
npm install -g @illli-studio/ai-rss
ai-rss login
```

用邮箱和密码登录打开的 [ai-rss](https://rss.illli.cc/) 网页，输入终端显示的授权码并确认。网页已登录时直接授权即可，后续不用重复登录。首次采集前，在工作台绑定微信读书账号。

不想全局安装 CLI，可以运行 `npx @illli-studio/ai-rss login`。

## 安装 AI 技能

支持 `skills` 安装器的客户端，直接从 GitHub 安装技能：

```sh
npx skills add illli-studio/ai-rss --skill ai-rss
```

技能直接调用 npm 正式版，无需下载源码或单独构建 CLI。WorkBuddy 可通过「添加技能 → 上传技能」导入技能目录或 ZIP。[技能说明](skills/ai-rss/SKILL.md)和[完整命令](skills/ai-rss/references/commands.md)列出了全部操作。

登录后可以直接说：「把这几个公众号加进竞品组，采集一轮。告诉我哪些没跑成功，再把最近的新品和调价动态按来源列出来。」

## 可以用它做什么

| 能力 | 一句话交给 AI | 最后拿到什么 |
| --- | --- | --- |
| 订阅管理 | 「从这几篇文章找出对应公众号并订阅，暂停旧的活动号」 | 新增或暂停的订阅清单；同名来源不明确时给出候选 |
| 批量采集 | 「把这组公众号采一轮，告诉我哪些已经完成」 | 每个来源的任务 ID、排队状态或失败原因 |
| 采集排障 | 「昨天为什么没更新？看看是排队、授权问题，还是已经采过」 | 最近任务、来源状态和采集账号状态；可重试符合条件的任务 |
| 跨号监控 | 「把这几个竞品号编成一组，以后检查新品和调价的新增」 | 保存的来源与关键词；下次按检查位置继续 |
| AI / 科技日报 | 「盯这组科技号，每天早上 9 点生成日报」 | 内置 200+ 关键词、可配置的过滤与时间、Markdown 和私有报告 RSS |
| 舆情线索 | 「对比最近一周和上一周的安全争议和新品动态」 | 主题变化、关键词证据和原文；明确标注缺失或部分覆盖 |
| 阅读量追踪 | 「估算这几篇的取数成本，再更新阅读和互动快照」 | 曼格云实时报价、带时间的阅读/点赞等快照、可比较的阅读变化 |
| 知识库与推送 | 「把命中原文存到我的 ima，每天 9 点给群里发摘要」 | 按规则选择知识库/文件夹、重复导入去重、飞书群推送及投递状态 |
| 历史检索 | 「找过去 30 天提到申报窗口的文章，逐条给出原文」 | 按来源、时间、关键词找到的归档，含出处与正文状态 |
| 收藏与整理 | 「收藏这几篇，另外把新品公告整理成一份资料」 | 工作台收藏或可继续增删的专题；按需导出 Markdown / JSON |
| 工具接入 | 「把查询结果交给我的脚本，日常更新继续在阅读器看」 | CLI 的 JSON 结果，以及核心服务的私有 RSS / Atom / JSON Feed 和 Open API |

## 同一份公众号归档，怎么输出

| 输出 | 能拿到什么 | 从哪里用 |
| --- | --- | --- |
| **RSS 2.0 / Atom 1.0 / JSON Feed 1.1** | 每个公众号可以单独订阅，也可以把全部已归档来源汇成一条私有 Feed。随采集更新，保留来源、原文链接、发布时间及已归档图文 | 工作台「Feed 与 API → 阅读器订阅」 |
| **OPML 2.0** | 导出公众号订阅清单，一次导入支持 OPML 的阅读器；这是清单，不是文章备份 | 工作台「Feed 与 API → 阅读器订阅」 |
| **Open API** | 按来源、时间、关键词分页读取结构化数据，包括标题、摘要、原文链接和 Markdown 正文 | [公众号 Open API 文档](https://rss.illli.cc/docs/api) |
| **单篇 Markdown / HTML** | 保存已归档文章，带到笔记或后续编辑流程 | 工作台「文章归档」的文章详情 |
| **CLI JSON / 合集 Markdown** | 脚本直接使用查询和操作结果；需要整理专题时，合集可导出 Markdown 或 JSON，保留来源、时间和原文链接 | `ai-rss article list`、`ai-rss collection export` 等 |
| **日报 Markdown / 私有 RSS** | 按监控规则生成日报，可在阅读器订阅报告，也能把 Markdown 保存到文件 | `ai-rss report show`、`ai-rss intel feed` |

Feed 的阅读器订阅链接由核心服务生成。用 [Feed 接入指南](https://rss.illli.cc/docs/wechat-rss)选择单号或聚合链接；无需安装 CLI，也不要把 AI 控制密钥当 Feed Key 使用。

### 为什么用 ai-rss

- **真的能操作。** 一把 AI 控制密钥可以让 AI 添加或暂停公众号、提交采集、查询任务进度、管理监控组和合集。执行结果会告诉你实际成功了什么、什么还在排队。
- **装好后有机会马上回看最近动态。** 核心服务首次采集最多检查每个号最近 50 篇，之后增量更新；实际覆盖取决于上游可访问范围和采集账号状态，不代表能拿到全量历史。
- **从上次继续，不用反复翻同一批文章。** 监控组保存来源、规则和增量检查位置，后续只处理新增。可以直接读新增，也可以按需把它们加入一个已有专题。
- **结论能回到证据。** 导出保留标题、来源、发布时间、摘要和原文链接。正文缺失会标注；监控结果同时带各来源的最近成功时间、错误和任务状态，方便分辨没命中和采集异常。
- **同一份归档服务不同工具。** 在网页看原文排版，用 RSS / Atom / JSON Feed 在阅读器跟更新，用 CLI 或 AI 做筛选和导出。工具包可以连自己的 Docker 实例，或连接支持这套接口的托管实例。
- **中文说明，脚本友好。** 面向人的说明、示例和报错都用中文；命令、选项和 JSON 字段固定，方便在 WorkBuddy、终端和自动化工具之间复用。

## 三个可以独立运行的用法

下面的 ID 只用来示范。实际操作时，先从 `source add` 或 `source list` 的结果拿到真实订阅 ID。

**管理订阅与采集：**

```sh
ai-rss source add "公众号名称"
ai-rss source list
ai-rss fetch run --source "MP_WXS_123,MP_WXS_456"
ai-rss job wait "<上一步返回的任务ID>" --timeout 120
```

**监控多个来源：**

```sh
ai-rss monitor create "竞品动态" --sources "MP_WXS_123,MP_WXS_456" --keywords "新品,调价,价格"
ai-rss monitor check "竞品动态" --days 30
ai-rss monitor check "竞品动态" --new
```

**回查原文与收藏：**

```sh
ai-rss article list --source MP_WXS_123 --keyword "价格" --days 30
ai-rss article show 123
ai-rss article star 123
```

以后运行 `ai-rss collection save "新品与价格追踪" --from-monitor "竞品动态" --new`，会把本批新增存入同一合集。若 `hasMore` 为真，可以继续处理后续批次。历史查询用返回的 `nextOffset` 配合 `--offset` 翻页。只想看新增则运行 `monitor check "竞品动态" --new`，它也会推进检查位置；想先预览不推进，用 `--days`。新建监控组从当时已经入库的位置开始，旧文章用时间条件回查。关键词按「任一命中」筛选标题或正文。

碰到同名公众号，`source add` 会返回候选项；先确认公众号，再用 `source add --fakeid <公众号标识> --title <名称>`。采集结果为排队时，可用 `job status` 或 `job wait` 跟进。采集受账号状态、队列和套餐额度影响；`ai-rss` 自身不另起采集服务，也不默认替用户定时推送。

## 定时监控、日报与投递

```sh
ai-rss monitor create "科技号" --sources "MP_WXS_123,MP_WXS_456"
ai-rss intel create "科技日报" --monitor "科技号" --preset ai-tech --at 09:00
ai-rss intel feed "科技日报"
ai-rss intel analyze "科技日报" --days 7
```

每天北京时间 9 点由服务生成报告，CLI 不用一直开着。规则可以选择自己的词、排除词或内置 AI / 科技词库；可配置多个规则，分别选择公众号、知识库和推送目标。[定时规则、ima、飞书、阅读量与舆情说明](skills/ai-rss/references/intelligence.md)含完整命令。没有第三方凭据时，监控、Markdown、报告 RSS 和主题分析仍可使用。

阅读量使用曼格云独立取数，有费用；先用 `metrics quote` 获取实时报价，再明确提供 `--max-cost` 才能刷新。未知阅读数不会记成零，「10 万+」不参与精确增量计算。舆情报告列出命中文章和上下文，不把关键词当作已核实事实。

## 体验期或会员到期

CLI 和技能会提示到期并给出当前实例的套餐页链接。打开链接即可开通或续费；不需要重装技能。新的定时报告和第三方投递在到期时暂停。

全部命令和参数见[中文完整命令手册](skills/ai-rss/references/commands.md)，或运行 `ai-rss --help`。本项目使用 MIT 许可证。

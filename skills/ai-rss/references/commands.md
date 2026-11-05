# ai-rss 完整能力与命令

所有示例都以 `ai-rss` 开头。技能执行时改用 npm 正式版前缀 `npx --yes @illli-studio/ai-rss@0.2.0`。名称或关键词含空格时加引号；列表可用逗号分隔。实际操作时使用查询返回的真实 ID，不从显示名称推断 ID。

## 登录、退出、概览与审计

| 命令 | 能做什么 |
| --- | --- |
| `ai-rss login [--url 站点地址] [--no-browser]` | 在浏览器确认连接；默认尝试官方实例，自托管传实例根地址。打开终端提供的链接，登录或注册后核对当前工作空间并确认。新版链接自动带上授权码，旧版需手动输入。授权完成后保存本机登录。 |
| `ai-rss logout [--local-only]` | 默认撤销此次登录签发的服务器密钥，再清除本机登录。离线时可用 `--local-only` 仅清除本机，此时还需到工作台撤销服务器密钥。不会撤销从环境变量注入的手动密钥。 |
| `ai-rss status` | 检查当前实例、控制接口、工作空间和套餐状态。 |
| `ai-rss overview` | 查看采集账号状态、订阅、近期任务、采集进程状态、文章数和正文缺失数；用于排查为什么某个号没更新。 |
| `ai-rss audit` | 读取自己工作空间最近 30 条 AI 操作记录。 |

自动化可同时配置 `AI_RSS_URL` 和 `AI_RSS_KEY`，无需交互登录。登录、扫码采集授权是两个独立步骤。旧实例必须先升级核心服务才支持快速登录。

## 订阅与采集

| 命令 | 能做什么 |
| --- | --- |
| `ai-rss source list` | 查看已有来源、订阅 ID、启用状态、采集计划与最近结果。 |
| `ai-rss source search "公众号名称或文章链接"` | 提交来源搜索并等待结果；只返回候选，不添加订阅。 |
| `ai-rss source add "公众号名称或文章链接"` | 唯一匹配时订阅；同名或不明确时返回候选，请用户确认。 |
| `ai-rss source add --fakeid ID --title "公众号名称"` | 用已确认的公众号标识订阅，无需再次搜索。 |
| `ai-rss source pause 订阅ID` | 暂停后续采集并取消该来源排队中的任务；保留原归档。 |
| `ai-rss source resume 订阅ID` | 恢复来源采集，受套餐额度限制。 |
| `ai-rss source interval 订阅ID --minutes 分钟` | 修改后续采集间隔；服务按套餐限制调整，以返回的间隔为准。 |
| `ai-rss fetch run --source "ID1,ID2"` | 一次提交多个已订阅来源，返回每个来源的任务 ID 或错误。入队不等于采集完成；部分失败时仍保留成功项。 |
| `ai-rss job status 任务ID` | 查看排队、运行、成功、失败或取消状态，以及结果、错误和重试信息。 |
| `ai-rss job wait 任务ID [--timeout 秒]` | 轮询任务，默认等待 90 秒；终端等待超时不会取消后台任务。 |
| `ai-rss job cancel 任务ID` | 请求取消排队或运行中的任务；再查状态核实。 |
| `ai-rss job retry 任务ID` | 为失败或取消的采集、账号验证任务发起重试；扫码和搜索需重新走对应入口。 |

先看状态再重试。若采集授权失效，先让用户回工作台重新扫码。首轮最多检查每个号最近 50 篇，具体取决于账号和上游可访问范围。

## 查文章与收藏

| 命令 | 能做什么 |
| --- | --- |
| `ai-rss article list [--source ID] [--keyword 词] [--days 天] [--page 页] [--limit 篇]` | 查询自己的归档。可用来源、标题或正文关键词、发布时间筛选；默认每页 20 篇，最多 100 篇。 |
| `ai-rss article show 文章ID` | 查看标题、来源、发布时间、原文链接、已归档正文及完整状态。 |
| `ai-rss article star 文章ID` | 收藏文章。 |
| `ai-rss article unstar 文章ID` | 取消收藏，不影响文章归档或已保存的合集。 |

## 多号监控

| 命令 | 能做什么 |
| --- | --- |
| `ai-rss monitor list` | 查看监控组、来源、关键词和增量位置。 |
| `ai-rss monitor create "组名" --sources "ID1,ID2" [--keywords "词1,词2"]` | 创建或更新同名组。关键词在标题或正文中命中任意一个即匹配；不传关键词则检查这些来源的全部文章。 |
| `ai-rss monitor check "组名" [--days 天] [--limit 篇] [--offset 篇]` | 按范围回查现有归档，不推进增量位置。历史结果有下一页时，用 `nextOffset` 继续。 |
| `ai-rss monitor check "组名" --new [--limit 篇]` | 读取上次增量位置之后新入库的命中文章，并推进该组的位置。可看到晚入库的旧文章。 |
| `ai-rss monitor delete "组名"` | 删除该组规则和增量位置；不删除订阅、归档或已有合集。 |

新建组的增量位置从创建时的归档边界开始，想看此前的内容用历史查询。`--new` 不能与 `--days` 或 `--offset` 混用；若 `hasMore` 为真，继续用相同增量命令处理后续批次。手动检查不会开启定时任务；需要定时报告、阅读量、舆情、ima 或飞书时，见[情报命令手册](intelligence.md)。

## 合集：选用的整理方式

| 命令 | 能做什么 |
| --- | --- |
| `ai-rss collection list` | 查看合集及其文章数量。 |
| `ai-rss collection save "合集名" --articles "ID1,ID2"` | 按文章 ID 新建或追加合集；已有条目不重复添加。 |
| `ai-rss collection save "合集名" --from-monitor "组名" [--days 天] [--limit 篇] [--offset 篇]` | 将监控组历史命中加入合集，不推进增量位置。 |
| `ai-rss collection save "合集名" --from-monitor "组名" --new [--limit 篇]` | 先保存新增，再一并更新监控位置；需要保存新增时优先用此命令，避免先消费掉增量。 |
| `ai-rss collection remove "合集名" --article 文章ID` | 仅从这个合集移出该篇文章。 |
| `ai-rss collection delete "合集名"` | 删除合集，保留其中文章的原始归档。 |
| `ai-rss collection export "合集名" [--format markdown\|json]` | 导出条目、摘要、来源、时间和原文链接；默认 Markdown，输出到终端。 |

## 命令帮助与数据接入

- `ai-rss --help`（也可用 `-h` 或不带命令运行）列出命令；`ai-rss --version` 查看 CLI 版本。
- 大多数命令返回 JSON；帮助和 Markdown 导出是文本。终端脚本可按退出状态和具体任务结果分别判断。
- **RSS 2.0、Atom 1.0、JSON Feed 1.1**：工作台「Feed 与 API → 阅读器订阅」复制单号或全量聚合私有链接；阅读器持续获取已归档图文、原文链接与发布时间。**OPML 2.0** 导出订阅清单用于换阅读器。
- **Open API** 返回分页的结构化文章、摘要与 Markdown 正文；**单篇 Markdown / HTML** 在工作台文章详情导出。CLI 没有读取或重置私有 Feed Key 的命令，AI 控制密钥不能用来拼接 Feed 链接。

浏览器内的扫码授权、密码、支付与站长管理由用户在工作台处理，不是本技能的权限。

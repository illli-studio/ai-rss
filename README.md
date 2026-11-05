# ai-rss · 微信公众号自动化 CLI

**微信公众号自动化工具：批量采集、跨号监控、历史检索，接入 RSS 和 AI。**

用终端、脚本或 WorkBuddy 操作自己的公众号订阅。可以查一个号今天为什么没更新，也可以让 AI 把加号、批量采集、排障、筛选和导出串起来。文章持续归档，保留来源与原文链接，同一份内容可以在网页、阅读器和 AI 工具里使用。

[官网](https://rss.illli.cc/) · [接入指南](https://rss.illli.cc/docs/ai-rss) · [完整命令](skills/ai-rss/references/commands.md) · [WorkBuddy 技能](skills/ai-rss/SKILL.md)

**试用样例不需要账号，也不会联网：**

```sh
git clone https://github.com/illli-studio/ai-rss.git
cd ai-rss
node bin/ai-rss.mjs demo
```

样例用虚构数据演示多号订阅、采集排障、关键词监控和历史回查。只想看专题导出的样式，可以运行 `node bin/ai-rss.mjs demo collection`。

## 可以用它做什么

| 能力 | 一句话交给 AI | 最后拿到什么 |
| --- | --- | --- |
| 订阅管理 | 「从这几篇文章找出对应公众号并订阅，暂停旧的活动号」 | 新增或暂停的订阅清单；同名来源不明确时给出候选 |
| 批量采集 | 「把这组公众号采一轮，告诉我哪些已经完成」 | 每个来源的任务 ID、排队状态或失败原因 |
| 采集排障 | 「昨天为什么没更新？看看是排队、授权问题，还是已经采过」 | 最近任务、来源状态和采集账号状态；可重试符合条件的任务 |
| 跨号监控 | 「把这几个竞品号编成一组，以后检查新品和调价的新增」 | 保存的来源与关键词；下次按检查位置继续 |
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

Feed 的阅读器订阅链接由核心服务生成。用 [Feed 接入指南](https://rss.illli.cc/docs/wechat-rss)选择单号或聚合链接；无需安装 CLI，也不要把 AI 控制密钥当 Feed Key 使用。

### 为什么用 ai-rss

- **真的能操作。** 一把 AI 控制密钥可以让 AI 添加或暂停公众号、提交采集、查询任务进度、管理监控组和合集。执行结果会告诉你实际成功了什么、什么还在排队。
- **装好后有机会马上回看最近动态。** 核心服务首次采集最多检查每个号最近 50 篇，之后增量更新；实际覆盖取决于上游可访问范围和采集账号状态，不代表能拿到全量历史。
- **从上次继续，不用反复翻同一批文章。** 监控组保存来源、规则和增量检查位置，后续只处理新增。可以直接读新增，也可以按需把它们加入一个已有专题。
- **结论能回到证据。** 导出保留标题、来源、发布时间、摘要和原文链接。正文缺失会标注；监控结果同时带各来源的最近成功时间、错误和任务状态，方便分辨没命中和采集异常。
- **同一份归档服务不同工具。** 在网页看原文排版，用 RSS / Atom / JSON Feed 在阅读器跟更新，用 CLI 或 AI 做筛选和导出。工具包可以连自己的 Docker 实例，或连接支持这套接口的托管实例。
- **中文说明，脚本友好。** 面向人的说明、示例和报错都用中文；命令、选项和 JSON 字段固定，方便在 WorkBuddy、终端和自动化工具之间复用。

## 开始连接

运行 `ai-rss login`，在浏览器登录 [ai-rss](https://rss.illli.cc/)，输入终端显示的授权码并确认。自托管用户可传 `--url http://127.0.0.1:5200`；远程终端用 `--no-browser` 手动打开授权页。授权后 CLI 保存本机登录，后续命令直接使用；`ai-rss logout` 会撤销此次登录签发的密钥。

自动化也可以在工作台「Feed 与 API → 密钥管理」创建 AI 控制密钥，并同时设置 `AI_RSS_URL` 和 `AI_RSS_KEY`。密码和密钥都不要发到聊天。CLI 登录只连接工作空间，首次采集仍需在工作台绑定自己的微信读书账号。使用快速登录前，核心服务需要更新到支持它的版本。

需要 Node.js 22 或更高版本。从 npm 安装：

```sh
npm install -g @illli-studio/ai-rss
ai-rss login
ai-rss status
ai-rss overview
```

也可以运行 `npx @illli-studio/ai-rss demo` 直接体验，或在源码目录用 `node bin/ai-rss.mjs`。部署在自己机器上时，根地址可以用 `http://127.0.0.1:5200`；其他实例需要 HTTPS。

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

## 在 WorkBuddy 或其他 AI 助手里用

导入 [微信公众号自动化技能](skills/ai-rss/SKILL.md)。若拿到的是带 CLI 的技能 ZIP，可以直接使用包内的 Node 脚本；只导入技能说明时，需先让助手运行命令的环境能找到 CLI。没配置密钥也可以先让它「演示一下能做什么」。

维护者可以运行 `python scripts/package-skill.py`，在 `dist/` 生成带 CLI 的技能 ZIP；运行 `npm pack --pack-destination dist` 可以生成可本地安装的 npm 包。

试着说：「把这几个公众号加进竞品组，采集完成后告诉我哪些号没跑成功，再把最近的新品和调价动态按来源列出来。」如果只想查一个任务、搜一篇旧文章，也可以单独下指令。

## 两个仓库怎么分

- [核心服务](https://github.com/ITELMN/irss)：官网、工作台、授权采集、文章归档、私有 Feed、权限和 API。
- 本仓库：CLI、JavaScript 客户端与中文技能。通过核心 API 执行操作，可用 `ai-rss audit` 回查最近的 AI 写操作。

全部命令和参数见[中文完整命令手册](skills/ai-rss/references/commands.md)，或运行 `ai-rss --help`。本项目使用 MIT 许可证。

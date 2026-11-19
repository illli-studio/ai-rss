# 公众号技能安装包对照调查 · 2026-11-19

从 SkillHub 的公开目录按任务取样，下载并解包 40 个不同技能，每类 10 个。以安装包内的定义、示例、脚本或模板为依据。表格链接指向本次实际下载的归档。名称相似不代表与 WorkBuddy 推荐栏资产同一版本；以下不是榜单，也不以下载数推断质量。

文章搜索均针对微信；另外三类同时纳入公众号直接竞品和 RSS、抖音、小红书、电商等相邻任务。未运行第三方代码或接入其收费后台。无法下载的条目及名称为日报、实际内容为角色扮演的条目均已替换。

## 文章搜索

| 技能安装包 | 输入、执行与交付 | 边界及对 IRSS 的启示 |
|---|---|---|
| [wechat-article-search](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/wechat-article-search/0.1.0.zip) | 关键词与数量；脚本解析搜索页并可输出 JSON | 依赖 cheerio，检索结果和最终直链是两步；IRSS 可分别报告命中数和有链接篇数。 |
| [aiskill-wechat-search-pro](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/284202/aiskill-wechat-search-pro/1.2.13.zip) | 词、排序方式；相关、最新和点赞三种排列 | 示例采用手机两行卡片，深度分析另展开；IRSS 有文本证据即可支持相关排序，点赞排序需要相应指标。 |
| [wx-search](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/309638/wx-search/1.1.5.zip) | 按词及页数提交任务，然后轮询结果 | 输出模块区分已完成、处理中和失败；适合耗时采集，充值与授权增加首用步骤。 |
| [jisu-wechat-article](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/jisu-wechat-article/1.0.3.zip) | 关键词与数量；以固定字段逐篇呈现来源、时间和链接 | 解析最终 URL 需要额外请求；找不到可用原文时不宜把中转地址包装成已验证来源。 |
| [aiskill-wechat-search](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/102834/aiskill-wechat-search/1.11.17.zip) | 输入主题后返回阅读、在看等互动卡片及计费结构 | 示例明确标注历史样本；这些指标取决于授权数据源，IRSS 不应推算没有取得的计数。 |
| [dfghhuhju](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/258376/dfghhuhju/1.0.0.zip) | 关键词检索出标题、摘要及来源，再交给阅读步骤 | 搜索与读全文可以分别验收；包内也描述了外部付费服务，成功检索不等于已获正文。 |
| [wechat-article-full](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/wechat-article-full/1.0.0.zip) | 关键词检索可选择追加全文提取及保存文件 | 把轻量列表和全文阅读拆开是好设计；本次静态检查仅确认说明及依赖清单，未核验提取成功率。 |
| [wechat-search-weread](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/wechat-search-weread/1.0.3.zip) | 微信读书登录后搜索、滚动、提取链接，最后给前十及完整列表 | 分别统计搜到、提取到、有链接；浏览器及登录状态是额外依赖。 |
| [yizhuan-cli-installer-wechat](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/183261/yizhuan-cli-installer-wechat/1.0.9.zip) | 关键词或作者查询，统一 CLI 输出作品或作者数据 | 文章指标和账号指标各有口径；接入需要 CLI 和 Key，全零时应提示排序缺乏区分度。 |
| [silas-wechat-article-search](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/silas-wechat-article-search/2.0.0.zip) | 关键词走多源检索，单篇 URL 可用解析脚本保存 JSON | 备用来源可能是转载；归档报告应让读者看清链接出处。 |

## 每日简报

| 技能安装包 | 输入、执行与交付 | 边界及对 IRSS 的启示 |
|---|---|---|
| [wechat-ai-article--redfox](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/wechat-ai-article--redfox/1.0.3.zip) | 按关注方向或历史日期生成公众号 HTML 日报，终端也有分类表 | 依赖 Redfox Key；有可回查的指定日期比只支持今天更实用。 |
| [playlet-wechat-feed](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/89244/playlet-wechat-feed/1.0.2.zip) | 输入短剧题材、账号和日期，筛选后返回题材聚类和日报 | 脚本校验题材及可查询日期，数据有更新时差；零命中不能擅自扩大范围。 |
| [karpathy-curated-rss-brief](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/karpathy-curated-rss-brief/1.0.2.zip) | 精选 RSS 列表生成日报，模板含核心主题、编者观察和数据 | 样本太少时说明里允许扩至 48 小时；IRSS 应保留用户指定窗口，扩窗需标清。 |
| [rss-daily-digest](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/rss-daily-digest/1.0.0.zip) | 从配置好的 RSS 源抓取，格式化脚本按主题输出文件 | 订阅配置是前提；源失效与当天没有匹配内容应分别呈现。 |
| [dailybit-tech-digest](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/dailybit-tech-digest/2.5.0.zip) | 输入标签取当天内容，再按文章 ID 批量取详情，汇成带来源的趋势条目 | 二段读取节约正文开销；合成判断应保留各个原始依据。 |
| [cn-daily-briefing](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/cn-daily-briefing/1.1.0.zip) | 资讯来源与关键词聚合，脚本支持 RSS、HN 等并生成分类报告 | 精简和详细是两种阅读预算；跨领域热度不能直接等同于个人订阅的重要性。 |
| [daily-briefing-pipeline](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/195282/daily-briefing-pipeline/1.0.0.zip) | 指定领域后从检索走到 Markdown、HTML、部署、邮件及归档 | 流程模板把不确定点单列；多种外部交付都需要相应环境，一次阅读无需默认全开。 |
| [ai-focused-daily-brief](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/ai-focused-daily-brief/1.1.0.zip) | 按日期建立候选清单，同日归并并排查历史重复，再生成日报 | 去重保留过程记录；多号转述同一事件与同链接重复是两种不同问题。 |
| [mzu-news-briefing](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/mzu-news-briefing/2.0.4.zip) | 多源科技资讯按热度分级，报告要求可溯源 | 搜索依赖可用后端，配置成本较高；分类优先级只有在数据充足时才有意义。 |
| [daily-briefing-generator](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/daily-briefing-generator/1.0.0.zip) | 主题或来源列表生成行业 Markdown 简报，说明还介绍定时分发 | 本次包内有生成脚本；说明中的 schedule_briefing.py 未见对应文件，需分别验证即时与定时交付。 |

## 竞品监控

| 技能安装包 | 输入、执行与交付 | 边界及对 IRSS 的启示 |
|---|---|---|
| [aiskill-gzh-competitor-monitor](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/259970/aiskill-gzh-competitor-monitor/0.2.11.zip) | 贴竞品文章链接建立订阅，首次建立基线，以后交付新增日报 | 有示例日报和轮次测试；首次查到历史文章与竞品刚刚发布应区分。 |
| [competitor-watch-v2](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/competitor-watch-v2/1.0.0.zip) | 按直接、替代、标杆三类设定跟踪范围，分类公开信号后给日报 | 以手册为主；不同类型对手宜分别解读，不能全放进一个排行榜。 |
| [competitor-monitoring-skill](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/100459/competitor-monitoring-skill/1.0.0.zip) | 监控对象与反馈材料进入变化字段清单，按提醒优先级交付 | 有独立授权代码及监控手册；紧急提醒、周报线索和背景材料不应同等醒目。 |
| [competitor-sentinel](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/125143/competitor-sentinel/1.0.0.zip) | 把搜索快照保存下来，比较已有快照，分别列新增与显著变化 | 脚本有相似度比较；文本改写可能被识别为变化，应回查两期依据。 |
| [amazon-competitor-monitor](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/270185/amazon-competitor-monitor/1.0.3.zip) | 按 SKU 跟踪价格、评分、评论和排名快照，越过阈值才报告 | 不同字段需要独立基线，商品排名规则不适合直接移植到公众号文章。 |
| [competitor-monitor-claw](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/competitor-monitor-claw/1.0.0.zip) | 从 CSV 建立竞品名单并用 SQLite 保存历史和价格告警 | 说明明确采集函数使用模拟数据；可借鉴前后值对照，真实告警需要真实采集。 |
| [okflow-model-competitor-weekly](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/295535/okflow-model-competitor-weekly/1.0.1.zip) | 竞品、平台、指标和周期生成周报、动态表、机会清单 | 包内主要是工作流定义，依赖授权数据；建议动作应跟随证据强度。 |
| [geo-competitor-monitor](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/geo-competitor-monitor/1.0.0.zip) | 输入品牌、对手、平台及周期，按规则进行 GEO 对比 | 规则配置与监控脚本独立；生成式搜索可见度和公众号发布动态是不同指标。 |
| [gmai-competitor-tracker](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/239745/gmai-competitor-tracker/1.0.0.zip) | 给竞品清单与快照，由付费后端做监控简报 | 有样例输入和支付服务定义；客户端文件本身不足以验证后台报告质量。 |
| [guaikei-douyin-competitor-watch](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/159796/guaikei-douyin-competitor-watch/1.0.0.zip) | 按关键词、账号和内容检索抖音数据，可按最新或点赞排 | 脚本按查询意图区分入口，需有效令牌；渠道差异使点赞榜不可直接移植。 |

## 数据分析与账号对标

| 技能安装包 | 输入、执行与交付 | 边界及对 IRSS 的启示 |
|---|---|---|
| [flamingotech-da-wechat-mp](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/287262/flamingotech-da-wechat-mp/1.0.0.zip) | 覆盖打开、增长、分享及转化等口径，指引核对平台数据 | 知识说明型技能；计算打开率等比例必须先取得正确分母。 |
| [wechat-oa-operations](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/278903/wechat-oa-operations/1.0.0.zip) | 从授权的公众号后台串联内容运营、选题与发布 | 有排障手册与文风模板；能取文章不代表有账号后台权限或粉丝数据。 |
| [benchmark-account-analyst](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/298379/benchmark-account-analyst/0.1.2.zip) | 以自身赛道为起点找抖音标杆，制作证据表并给首条内容方案 | 低输入门槛有利于启动；付费检索或人像视频生成属于单独操作。 |
| [creator-account-teardown](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/151706/creator-account-teardown/0.2.8.zip) | 目标账号加自身定位，拆解后生成适用于自己的内容矩阵 | 要求每个数字记录来源及读取时间；单纯复述别人的账号无法支持迁移判断。 |
| [douyin-kol-search](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/36049/douyin-kol-search/1.0.12.zip) | 按赛道及关键词找高赞低粉账号，用表单维度筛候选 | 依赖服务 Key；低粉高赞是样本筛选标准，不能由单篇阅读量推断。 |
| [benchmark-account-decoder](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/292076/benchmark-account-decoder/0.1.1.zip) | 用户给若干篇材料，逐篇拆解并按门槛决定是否做高低对照 | 有样本不足示例及汇总模板；可借鉴展示真实对照文章的做法。 |
| [okflow-model-account-checkup](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/295546/okflow-model-account-checkup/1.0.1.zip) | 输入账号或导出数据、周期、目标，输出更新分布、选题和机会 | 包内主要是方法说明；如果归档缺失，爆款率分母也会受影响。 |
| [vbgzvffdf](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/237261/vbgzvffdf/1.0.3.zip) | 基于微信公众号素材拆打开、分享及内容策略，按深度提供报告 | 有专业提示词及知识库；外部付费后端能力未经实测，材料缺少分母时不宜输出比例。 |
| [baokuan-article-analysis](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/125416/baokuan-article-analysis/1.0.0.zip) | 按赛道和关键词合并热文，日期窗口内去重排序并输出分赛道报告 | 公开热榜与单号完整历史不同，阅读快照可能滞后；同号对照应使用同来源样本。 |
| [xt-xhs-benchmark-account-analysis-v2](https://skillhub-1388575217.cos.accelerate.myqcloud.com/skills/271541/xt-xhs-benchmark-account-analysis-v2/1.0.2.zip) | 从自身账号或参考号出发，按适配度给可借鉴、需改造的动作 | 包内有分析量表和报告模板；高互动和适合自身选题需要分别说明。 |

## 对照后在 IRSS 中验证的改动

- 搜索可按命中关键词数、标题命中数、发布时间依次排序，保留原有最新排序。
- 简报在展示范围内统计有可用 HTTPS 原文链接的篇数。该指标没有探测外部链接的可访问性。
- 竞品监控可只取价格、产品或渠道线索，在截断展示条数之前执行过滤。
- 高表现文章给出最接近同号基准的实测样本，排除封顶读数，并保留基准算法与参与篇数。

## 仍值得验证

多日简报是否需要事件级去重，需要真实订阅的转载样本来评估误合并。竞品是否实际降价，需要同规格的新旧价格及日期。两者均不能由标题相似或单次提及价格直接断言。

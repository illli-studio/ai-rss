# 微信公众号选题策划 · 笺禾

WorkBuddy 内容创作类单专家。参考号来自当前 IRSS 账号的已有订阅。三个快捷问题分别生成完整周计划、指定主题周计划和每周三篇的轻量排期。每个选题保留推荐理由和原文出处。

专家包内置公众号文章搜索技能和 CLI，需要 Node.js 22+。在解压后的 skills/wechat-article-search 目录可运行：

```sh
node bin/ai-rss.mjs plan week --source "参考号甲" --source "参考号乙" --posts 7
node bin/ai-rss.mjs plan week --source "参考号甲" --topic "人工智能"
node bin/ai-rss.mjs plan week --source "参考号乙" --posts 3
```

排期按指定时区（默认 Asia/Shanghai）的下一个自然周计算。--days 可调整回看天数，--format json 可导出结构化排期。素材不足时只排有出处的选题。

在 ai-rss 仓库根目录运行 python scripts/package-expert.py --expert wechat-editorial-planner 重建 ZIP。开放平台上传时选择「专家」类型。MIT 许可。

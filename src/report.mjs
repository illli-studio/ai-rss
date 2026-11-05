const escape = (text) => String(text ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/[\\`*_[\]<>#]/g, '\\$&');
const safeLink = (text) => {
  try {
    const url = new URL(text);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href.replace(/[<>]/g, encodeURIComponent) : '';
  } catch { return ''; }
};

export function markdownReport(name, items) {
  const lines = ['# '+escape(name), '', '共 '+items.length+' 篇文章。', ''];
  const sorted = [...items].sort((a,b) => b.publishedAt-a.publishedAt || b.id-a.id);
  for (const item of sorted) {
    const date = Number.isFinite(item.publishedAt) && item.publishedAt > 0
      ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(item.publishedAt) : '日期未知';
    const link = safeLink(item.originalUrl);
    lines.push('## '+escape(item.title), '', escape(item.sourceTitle)+' · '+date, '');
    if (item.summary) lines.push(escape(item.summary), '');
    if (item.contentStatus !== 'complete') lines.push('正文未归档，请查看原文核实。', '');
    if (link) lines.push('[查看原文](<'+link+'>)', '');
  }
  return lines.join('\n');
}

export function demoReport(mode) {
  if (mode !== 'collection') return `# ai-rss 工作流演示（虚构数据）

这份示例不联网，也不会操作真实账号。下面是同一个工作空间里的几种独立用法。

## 管理订阅与批量采集

| 公众号 | 采集结果 |
| --- | --- |
| 白帆产品日志 | 已完成，新增 2 篇 |
| 北岸动态 | 已排队，可用任务 ID 跟进 |
| 松林科技观察 | 失败，采集授权已失效 |

先在工作台重新扫码，再重试符合条件的失败任务。排队中的任务不用重复提交。

## 查看跨号新增

「竞品动态」监控组选了这三个号，匹配「新品、调价」。本次有 1 篇命中：白帆发布协作工作台 2.0。北岸仍在排队、松林采集失败，这次不能判断它们是否发布了相关内容。

## 搜旧文章、核对出处

过去 30 天内，「价格」还命中北岸专业版调价公告。可读取已归档正文，核对生效日期，或者在工作台收藏这篇。正文缺失时，需要到原文核实。

## 按需交给其他工具

脚本可以接收 CLI JSON，也可以通过 Open API 查询归档。阅读器可订阅单号或全量聚合的 RSS、Atom、JSON Feed；更换阅读器时用 OPML 导出订阅清单。单篇文章可在工作台导出 Markdown 或 HTML。需要专题时运行 ai-rss demo collection 看合集导出示例。`;
  return markdownReport('竞品动态｜演示合集（虚构样例）', [
    { id: 1, title: '白帆发布协作工作台 2.0', sourceTitle: '白帆产品日志', publishedAt: Date.UTC(2026,10,2),
      summary: '新增多人批注；公告未披露新价格。', contentStatus: 'complete' },
    { id: 2, title: '北岸公布专业版调价', sourceTitle: '北岸动态', publishedAt: Date.UTC(2026,10,4),
      summary: '公告给出新套餐的生效日期，存量续费政策需查看原文。', contentStatus: 'complete' },
    { id: 3, title: '松林预告新品发布会', sourceTitle: '松林科技观察', publishedAt: Date.UTC(2026,10,5),
      contentStatus: 'missing' },
  ]);
}

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

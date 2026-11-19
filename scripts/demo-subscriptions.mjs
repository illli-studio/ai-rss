import { archiveWorkflow } from '../src/archive-workflows.mjs';
import { analyst } from '../src/analyst.mjs';

// A fixed reporting date keeps the examples useful on any installation date.
const now = Date.parse('2026-10-15T10:00:00+08:00');
const sources = ['山雀工坊', '林间实验室'].map((title, i) => ({
  id: String(i + 1), title, enabled: true, last_success: now / 1000,
}));
const samples = [
  [0, '人工智能相机新品开始预售', '标准版预售价 699 元，10 月 20 日起发货。', 480],
  [1, '人工智能相机推出夜拍固件', '旧款也支持夜景降噪，固件可免费下载。', 160],
  [0, '相机电池续航实测', '连续录像三小时后剩余电量为 18%。', 120],
  [0, '影像传感器升级说明', '新增弱光测试图和测量方法。', 100],
  [0, '夜拍镜头清洁手册', '本期介绍镜片清洁和收纳步骤。', 80],
  [1, '零售门店开启周末体验', '两家门店开放试拍；体验活动限周末。', 90],
];
const articles = samples.map(([index, title, body], i) => ({
  id: i + 1, title, summary: body, contentMarkdown: body, contentStatus: 'complete',
  sourceId: sources[index].id, sourceTitle: sources[index].title,
  publishedAt: now - (i + 1) * 3600000,
  originalUrl: 'https://example.org/irss-demo/' + (i + 1),
}));
const demo = {
  async request(path, { query = {} } = {}) {
    if (path === '/open-api/subscriptions') return { items: sources };
    if (path === '/open-api/articles') {
      const { sourceId, since = 0, until = now, q = '', page, pageSize } = query;
      const items = articles.filter(a => (!sourceId || sourceId === a.sourceId)
        && a.publishedAt >= since && a.publishedAt <= until && (a.title + a.summary).includes(q));
      return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length };
    }
    const match = path.match(/^\/api\/v1\/ai\/intelligence\/metrics\/(\d+)$/);
    if (!match) throw new Error('未知的示例数据查询');
    const i = Number(match[1]) - 1;
    return { items: [{ capturedAt: articles[i].publishedAt + 1800000, readNum: samples[i][3] }] };
  },
};

const [mode, ...args] = process.argv.slice(2);
const defaults = {
  search: ['--keyword', '人工智能'], brief: ['--timezone', 'Asia/Shanghai'],
  compare: ['--source', '山雀工坊', '--source', '林间实验室'],
  peers: ['--source', '山雀工坊'], performance: ['--source', '山雀工坊'],
};
try {
  if (!Object.hasOwn(defaults, mode)) throw new Error('请选择 search、brief、compare、peers 或 performance');
  const run = ['peers', 'performance'].includes(mode) ? analyst : archiveWorkflow;
  const defaultOption = defaults[mode][0];
  const options = args.includes(defaultOption) ? args : [...defaults[mode], ...args];
  const report = await run(demo, mode, options, now);
  const label = '离线演示 · 虚构订阅与文章 · 2026-10-15 · 链接仅示意';
  console.log(typeof report === 'string' ? label + '\n\n' + report : JSON.stringify({ label, report }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

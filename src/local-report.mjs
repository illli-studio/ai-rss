import { readFile } from 'node:fs/promises';
import { archiveWorkflow } from './archive-workflows.mjs';
import { csvArticles } from './csv-articles.mjs';
import { analyst } from './analyst.mjs';

// IRSS exports epoch milliseconds. Also accept explicitly zoned ISO timestamps.
function timestamp(value) {
  const time = typeof value === 'number' ? value :
    typeof value === 'string' && /(Z|[+-]\d\d:\d\d)$/i.test(value) ? Date.parse(value) : NaN;
  return Number.isSafeInteger(time) && time >= 0 && time <= 8640000000000000 ? time : NaN;
}

function parseRows(items) {
  if (!Array.isArray(items)) throw new Error('请提供文章数组，或包含 items 数组的 IRSS 合集 JSON。');
  const sources = new Map();
  const articles = [];
  const histories = new Map();
  const seen = new Set();
  for (const [index, row] of items.entries()) {
    const fail = message => { throw new Error('第 '+(index+1)+' 条文章：'+message); };
    if (!row || typeof row !== 'object') fail('需要文章对象');
    for (const field of ['sourceTitle','title']) {
      if (typeof row[field] !== 'string' || !row[field].trim()) fail('缺少 '+field);
    }
    for (const field of ['summary','excerpt','contentMarkdown','originalUrl']) {
      if (row[field] != null && typeof row[field] !== 'string') fail(field+' 应为文本');
    }
    const publishedAt = timestamp(row.publishedAt);
    if (!Number.isFinite(publishedAt)) fail('publishedAt 需为毫秒时间戳或带时区的 ISO 时间');
    const sourceTitle = row.sourceTitle.trim();
    const sourceId = String(row.sourceId ?? sourceTitle);
    const id = index+1;
    const identity = row.originalUrl || row.id;
    const key = JSON.stringify([sourceId,identity]);
    if (identity != null && identity !== '' && seen.has(key)) continue;
    seen.add(key);
    const history = row.snapshots ?? [];
    if (!Array.isArray(history)) fail('snapshots 应为数组');
    const snapshots = history.map(s => {
      const capturedAt = timestamp(s?.capturedAt);
      if (!Number.isFinite(capturedAt) || capturedAt < publishedAt ||
          !Number.isSafeInteger(s?.readNum) || s.readNum < 0 ||
          (s.readCapped !== undefined && typeof s.readCapped !== 'boolean')) fail('阅读快照需包含非负整数 readNum 和有效的观测时间 capturedAt');
      return {capturedAt,readNum:s.readNum,readCapped:s.readCapped===true};
    }).sort((a,b)=>b.capturedAt-a.capturedAt);
    histories.set(id,snapshots);
    sources.set(sourceId,{id:sourceId,title:sourceTitle,localFile:true});
    articles.push({...row,id,sourceId,sourceTitle,publishedAt,
      contentStatus:row.contentMarkdown ? row.contentStatus ?? 'complete' : 'missing'});
  }
  articles.sort((a,b)=>b.publishedAt-a.publishedAt || b.id-a.id);
  return {sources:[...sources.values()],articles,histories};
}

export async function localReport(mode, filename, args) {
  if (!['search','brief','compare','peers','performance'].includes(mode) || !filename || filename.startsWith('--'))
    throw new Error('用法：ai-rss local search|brief|compare|peers|performance 文件.json或.csv [查询参数]');
  let data;
  const raw = (await readFile(filename,'utf8')).replace(/^\uFEFF/,'');
  if (filename.toLowerCase().endsWith('.csv')) data=csvArticles(raw);
  else {
    try { data=JSON.parse(raw); } catch { throw new Error('无法解析 JSON，请使用 UTF-8 JSON 或 .csv 文章清单。'); }
  }
  const items=Array.isArray(data)?data:data?.items;
  const {sources,articles,histories}=parseRows(items);
  const api={localFile:true,async request(path,{query={}}={}) {
    if (path==='/open-api/subscriptions') return {items:sources};
    if (path==='/open-api/articles' || path==='/api/v1/articles') {
      const {sourceId,since=0,until=Infinity,q='',page,pageSize}=query;
      const needle=q.toLowerCase();
      const filtered=articles.filter(a=>(!sourceId || a.sourceId===sourceId) &&
        a.publishedAt>=since && a.publishedAt<=until &&
        (!needle || [a.title,a.summary,a.excerpt,a.contentMarkdown].some(t=>t?.toLowerCase().includes(needle))));
      return {items:filtered.slice((page-1)*pageSize,page*pageSize),total:filtered.length};
    }
    const match=path.match(/^\/api\/v1\/ai\/intelligence\/metrics\/(\d+)$/);
    if (!match) throw new Error('本地材料不支持该操作');
    return {items:histories.get(Number(match[1])) ?? []};
  }};
  const run=['peers','performance'].includes(mode)?analyst:archiveWorkflow;
  const result=await run(api,mode,args);
  const input={type:'local-file',rows:items.length,articles:articles.length,sources:sources.length};
  return typeof result==='string' ? '范围：用户提供的本地材料 · '+input.rows+' 条记录 · 去重后 '+input.articles+' 篇 · '+input.sources+' 个来源\n\n'+result : {...result,input};
}

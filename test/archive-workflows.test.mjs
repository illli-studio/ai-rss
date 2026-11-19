import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveWorkflow, dateWindow } from '../src/archive-workflows.mjs';

const now=Date.parse('2026-11-18T17:00:00Z');
const sources=[{id:'a',title:'甲',enabled:1,last_success:1},{id:'b',title:'乙',enabled:1,last_error:'登录过期'}];
const rows=Array.from({length:105},(_,i)=>({id:i+1,title:'AI 新品',sourceId:'a',sourceTitle:'甲',
  originalUrl:'https://example.org/'+i,publishedAt:now-i,contentStatus:'complete',
  contentMarkdown:'内容'.repeat(110)+'限时价 99 元'}));
function archive(items=rows, subs=sources) {
  return {request:async(path,{query:q}={})=>{
    if (path==='/open-api/subscriptions') return {items:subs};
    assert.equal(path,'/open-api/articles');
    const filtered=items.filter(a=>(!q.sourceId||a.sourceId===q.sourceId)&&a.publishedAt<=q.until&&
      (!q.since||a.publishedAt>=q.since)&&(!q.q||[a.title,a.contentMarkdown,a.summary,a.excerpt].join(" ").includes(q.q)));
    return {items:filtered.slice((q.page-1)*100,q.page*100),total:filtered.length};
  }};
}
test('search counts distinct matches across pages and keyword overlap, retaining newest evidence',async()=>{
  const r=await archiveWorkflow(archive(),'search',['--keyword','AI','--keyword','限时价','--limit','3','--format','json'],now);
  assert.equal(r.matched,105);
  assert.deepEqual(r.articles.map(a=>a.id),[1,2,3]);
  assert.match(r.articles[0].excerpt,/99 元/);
  assert.deepEqual(r.articles[0].matchedKeywords,['AI','限时价']);
});
test('brief filters at local midnight including when the UTC date differs',async()=>{
  const yesterday={...rows[0],id:123,publishedAt:Date.parse('2026-11-18T15:59:59Z')};
  const r=await archiveWorkflow(archive([yesterday,rows[0]]),'brief',['--timezone','Asia/Shanghai','--format','json'],now);
  assert.equal(r.window.date,'2026-11-19'); assert.equal(r.matched,1);
  for (const [date,hours] of [['2026-03-08',23],['2026-11-01',25]]) {
    const w=dateWindow(date,'America/New_York',now);
    assert.equal(w.until-w.since+1,hours*3600000);
  }
  assert.throws(()=>dateWindow('2026-02-30','Asia/Shanghai',now),/有效/);
});
test('comparison keeps source coverage and full-window tallies beyond displayed samples',async()=>{
  const r=await archiveWorkflow(archive(),'compare',['--source','甲','--source','乙','--limit','1'],now);
  assert.match(r,/甲 · 105 篇/); assert.match(r,/价格与促销 105 篇/);
  assert.match(r,/乙 · 0 篇/); assert.match(r,/登录过期/); assert.match(r,/限时价 99 元/);
  assert.match(r,/展示 1 篇/);
});
test('daily brief includes quieter accounts within the reading limit',async()=>{
  const small={...rows[0],id:999,originalUrl:'https://example.org/unique',sourceId:'b',sourceTitle:'乙',publishedAt:now-1000};
  const r=await archiveWorkflow(archive([...rows,small]),'brief',['--limit','2','--format','json'],now);
  assert.deepEqual(r.articles.map(a=>a.sourceId),['a','b']);
  assert.equal(r.matched,106);
});
test('ambiguous sources and empty workspaces give actionable results',async()=>{
  await assert.rejects(archiveWorkflow(archive([],sources.map(s=>({...s,title:'同名'}))),'compare',['--source','同名']),/同名订阅/);
  assert.match(await archiveWorkflow(archive([],[]),'brief',[]),/没有订阅/);
});

test('all keywords are verified before limiting results, including summary-only matches',async()=>{
  const items=[{...rows[0],title:'相机',contentMarkdown:''},
    {...rows[1],title:'相机',summary:'旧款支持夜拍',contentMarkdown:''}];
  const args=['--keyword','相机','--keyword','夜拍','--match','all','--limit','1'];
  const r=await archiveWorkflow(archive(items),'search',[...args,'--format','json'],now);
  assert.equal(r.matched,1);
  assert.equal(r.articles[0].id,items[1].id);
  assert.match(r.articles[0].excerpt,/旧款支持夜拍/);
  assert.match(await archiveWorkflow(archive(items),'search',args,now),/命中词：相机、夜拍/);
});
test('comparison surfaces an older actionable update ahead of routine copy',async()=>{
  const items=[{...rows[0],title:'周末随笔',contentMarkdown:''},
    {...rows[1],title:'动态',summary:'相机调价',contentMarkdown:''}];
  const r=await archiveWorkflow(archive(items),'compare',['--source','甲','--limit','1','--format','json'],now);
  assert.equal(r.coverage[0].matched,2);
  assert.equal(r.coverage[0].articles[0].id,items[1].id);
  assert.deepEqual(r.coverage[0].articles[0].signals,['价格与促销']);
});
test('one-minute brief shows the omitted count and keeps collection failures visible',async()=>{
  const r=await archiveWorkflow(archive(),'brief',['--limit','3','--timezone','Asia/Shanghai'],now);
  assert.match(r,/有更新的订阅：1 \/ 2/);
  assert.match(r,/102 篇未展开/);
  assert.match(r,/登录过期/);
});

test('calendar week includes local Sunday evening but excludes next Monday',async()=>{
  const dates=['2026-11-08T15:59:59Z','2026-11-08T16:00:00Z','2026-11-15T15:59:59Z','2026-11-15T16:00:00Z'];
  const items=dates.map((d,i)=>({...rows[i],publishedAt:Date.parse(d)}));
  const args=['--from','2026-11-09','--to','2026-11-15','--timezone','Asia/Shanghai'];
  const r=await archiveWorkflow(archive(items),'search',[...args,'--format','json'],now);
  assert.deepEqual(r.articles.map(a=>a.id),[3,2]);
  await assert.rejects(archiveWorkflow(archive(items),'search',[...args,'--days','7']),/择一/);
});
test('relevance considers all pages before limiting and latest remains the default',async()=>{
  const items=rows.map(a=>({...a,title:'普通资讯',contentMarkdown:'AI'}));
  items.at(-1).title='AI 专题';
  const args=['--keyword','AI','--limit','1','--format','json'];
  assert.equal((await archiveWorkflow(archive(items),'search',args,now)).articles[0].id,1);
  assert.equal((await archiveWorkflow(archive(items),'search',[...args,'--sort','relevance'],now)).articles[0].id,105);
});
test('signal filter and link coverage count their actual output scopes',async()=>{
  const items=[{...rows[0],title:'新品发布',contentMarkdown:'',originalUrl:'http://example.org'},
    {...rows[1],title:'秋季促销',contentMarkdown:'限时价 99 元'}];
  const r=await archiveWorkflow(archive(items),'compare',['--source','甲','--signal','price','--limit','1','--format','json'],now);
  assert.equal(r.matched,1);
  assert.equal(r.coverage[0].articles[0].id,items[1].id);
  assert.match(await archiveWorkflow(archive(items),'brief',['--timezone','Asia/Shanghai'],now),/1 \/ 2 篇附原文链接/);
});

test('price comparisons quote the incentive even when the launch comes first',async()=>{
  const item={...rows[0],title:'新车发布',contentMarkdown:'上市发布。'+'车型介绍。'.repeat(70)+'指导价保持不变，保险补贴 8000 元。'};
  const report=await archiveWorkflow(archive([item]),'compare',['--source','甲','--signal','price','--format','json'],now);
  assert.equal(report.matched,1);
  assert.match(report.coverage[0].articles[0].excerpt,/指导价保持不变，保险补贴 8000 元/);
});

test('topic briefs match visible link labels but ignore CDN image paths',async()=>{
  const art=rows.slice(0,2).map((a,i)=>({...a,title:'今日更新',contentMarkdown:i?'[AI 模型](https://example.org/model)':'![封面](https://example.org/sAI123.jpg)'}));
  const report=await archiveWorkflow(archive(art),'brief',['--keyword','AI','--format','json'],now);
  assert.equal(report.matched,1);
  assert.match(report.articles[0].excerpt,/AI 模型/);
});

test('brief merges identical originals before limiting the output',async()=>{
  const other={...rows[0],id:999,sourceId:'b',sourceTitle:'乙'};
  const r=await archiveWorkflow(archive([rows[0],other,rows[1]]),'brief',{limit:2,format:'json'},now);
  assert.equal(r.matched,3);
  assert.equal(r.uniqueStories,2);
  assert.deepEqual(r.articles[0].sources,['甲','乙']);
});
test('comparison keeps prior price evidence in its own window',async()=>{
  const old={...rows[0],id:999,publishedAt:now-8*86400000,contentMarkdown:'指导价保持不变，提供置换补贴'};
  const r=await archiveWorkflow(archive([rows[1],old]),'compare',['--source','甲','--previous','--format','json'],now);
  assert.equal(r.previous.window.until,r.window.since-1);
  assert.equal(r.coverage[0].matched,1);
  assert.equal(r.previous.coverage[0].matched,1);
  assert.deepEqual(r.previous.coverage[0].articles[0].priceEvidence,['补贴或优惠权益','官方标价']);
});

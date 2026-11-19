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
      (!q.since||a.publishedAt>=q.since)&&(!q.q||(a.title+a.contentMarkdown).includes(q.q)));
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
  const small={...rows[0],id:999,sourceId:'b',sourceTitle:'乙',publishedAt:now-1000};
  const r=await archiveWorkflow(archive([...rows,small]),'brief',['--limit','2','--format','json'],now);
  assert.deepEqual(r.articles.map(a=>a.sourceId),['a','b']);
  assert.equal(r.matched,106);
});
test('ambiguous sources and empty workspaces give actionable results',async()=>{
  await assert.rejects(archiveWorkflow(archive([],sources.map(s=>({...s,title:'同名'}))),'compare',['--source','同名']),/同名订阅/);
  assert.match(await archiveWorkflow(archive([],[]),'brief',[]),/没有订阅/);
});

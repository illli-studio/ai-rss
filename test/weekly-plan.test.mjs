import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyPlan} from '../src/weekly-plan.mjs';

const now=Date.parse('2026-11-22T16:05Z'); // Monday morning in Shanghai, Sunday in UTC.
function fixture() {
  const titles=['机器人仓储测评','校园植物观察','咖啡烘焙教程','独立电影配乐','城市无障碍新规','山地越野装备','数字绘画入门','海洋生态调查'];
  const articles=titles.map((title,i)=>({id:i,sourceId:i%2?'b':'a',title,summary:'研究笔记 '+(i<3?'专题甲':'其他'),
    publishedAt:now-i*3600000,originalUrl:'https://mp.weixin.qq.com/s/'+i}));
  articles.push({...articles[0],id:81,sourceId:'b',originalUrl:'https://mp.weixin.qq.com/s/81'});
  articles.push({...articles[4],id:90,title:'无原文材料',originalUrl:''});
  return {request:async(path,{query}={})=>{
    if(path==='/open-api/subscriptions') return {items:[{id:'a',title:'甲号',enabled:1},{id:'b',title:'乙号',enabled:1}]};
    assert.equal(path,'/open-api/articles');
    const rows=articles.filter(a=>a.sourceId===query.sourceId&&a.publishedAt>=query.since&&a.publishedAt<=query.until);
    return {items:rows.slice((query.page-1)*query.pageSize,query.page*query.pageSize),total:rows.length};
  }};
}
const args=['--source','甲号','--source','乙号','--format','json'];
test('seven distinct daily plans with links, source attribution and reasons across local week boundary',async()=>{
  const r=await weeklyPlan(fixture(),args,now);
  assert.equal(r.weekStart,'2026-11-30');
  assert.equal(r.plan.length,7);
  assert.equal(new Set(r.plan.map(i=>i.date)).size,7);
  assert(r.plan.every(i=>i.reason&&i.approach&&i.evidence.every(a=>a.originalUrl.startsWith('https://')&&a.sourceTitle)));
  assert(r.plan.some(i=>i.evidence.length===2));
});
test('theme schedule filters unrelated stories, merges duplicates, leaves uncovered slots',async()=>{
  const r=await weeklyPlan(fixture(),[...args,'--topic','专题甲'],now);
  assert.equal(r.plan.length,3);
  assert(r.plan.every(i=>i.evidence.every(a=>a.summary.includes('专题甲'))));
  const none=await weeklyPlan(fixture(),[...args,'--topic','缺失主题'],now);
  assert.equal(none.plan.length,0);
});
test('light plan spaces three stories through the coming week in the requested zone',async()=>{
  const r=await weeklyPlan(fixture(),[...args,'--timezone','UTC','--posts','3'],now);
  assert.deepEqual(r.plan.map(i=>i.date),['2026-11-23','2026-11-26','2026-11-29']);
});

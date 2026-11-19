import test from 'node:test';
import assert from 'node:assert/strict';
import { analyst } from '../src/analyst.mjs';

const now=Date.UTC(2026,8,20);
const hour=3600000;
function row(id,sourceId,title) {
  return {id,sourceId,title,publishedAt:now-10*hour,originalUrl:'https://example.org/'+id};
}
function api(items,histories={},names=['甲','乙','丙']) {
  const sources=names.map((title,i)=>({id:String(i),title,enabled:true,last_success:1}));
  return {request:async(path,options={})=>{
    assert.equal(options.method,undefined);
    if(path==='/open-api/subscriptions') return {items:sources};
    if(path==='/open-api/articles') {
      const {page,pageSize,sourceId,since,until}=options.query;
      const filtered=items.filter(x=>(!sourceId||x.sourceId===sourceId)&&x.publishedAt>=since&&x.publishedAt<=until);
      return {items:filtered.slice((page-1)*pageSize,page*pageSize),total:filtered.length};
    }
    assert.match(path,/^\/api\/v1\/ai\/intelligence\/metrics\/\d+$/);
    return {items:histories[path.split('/').pop()]??[]};
  }};
}
const json=['--format','json'];
test('peer recommendation reads all pages and links evidence on both sides',async()=>{
  const articles=Array.from({length:102},(_,i)=>row(i+1,'0','机器人 传感器'));
  articles.push(row(104,'1','机器人 传感器 应用'),row(105,'2','室内 装修'));
  const result=await analyst(api(articles),'peers',['--source','甲',...json],now);
  assert.equal(result.targetArticles,102);
  assert.deepEqual(result.recommendations.map(x=>x.title),['乙']);
  assert.equal(result.recommendations[0].examples[0].id,104);
  assert.equal(result.recommendations[0].targetExamples.length,2);
  await assert.rejects(analyst(api([],{},['甲','甲']),'peers',['--source','甲']),/同名/);
});
test('performance excludes subject from baseline, separates age bands and handles missing and capped measurements',async()=>{
  const readings=[500,90,100,110,0,null,50000];
  const articles=readings.map((n,i)=>row(i+1,'0','文章 '+i));
  articles[6].publishedAt=now-10*24*hour;
  const histories=Object.fromEntries(readings.map((readNum,i)=>[i+1,[{capturedAt:now-hour,readNum,readCapped:i===0}]]));
  const result=await analyst(api(articles,histories),'performance',['--source','甲',...json],now);
  assert.equal(result.coverage[0].measured,6);
  assert.equal(result.coverage[0].comparable,5);
  const [a]=result.highlights;
  assert.equal(a.baseline,95);
  assert.equal(a.peerCount,4);
  assert.equal(a.capped,true);
  assert.deepEqual(result.highlights.map(x=>x.id),[1]);
});
test('uncertain median, insufficient samples and zero median do not generate multipliers',async()=>{
  for(const [values,capped] of [[[10,20,30,2000],[1,2]],[[0,0,0,100],[]],[[1,100],[]]]){
    const articles=values.map((_,i)=>row(i+1,'0','文章 '+i));
    const snapshots=Object.fromEntries(values.map((readNum,i)=>[i+1,[{readNum,readCapped:capped.includes(i),capturedAt:now}]]));
    const r=await analyst(api(articles,snapshots),'performance',['--source','甲',...json],now);
    assert.equal(r.highlights.length,0);
  }
});
test('sampling reports incomplete coverage and never buys data',async()=>{
  const items=Array.from({length:102},(_,i)=>row(i+1,'0','A'));
  const r=await analyst(api(items),'performance',['--source','甲','--sample','101',...json],now);
  assert.deepEqual(r.coverage[0],{id:'0',title:'甲',total:102,checked:101,measured:0,comparable:0,highCount:0});
});

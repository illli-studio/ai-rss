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
    if(path==='/api/v1/articles') {
      assert.equal(options.query.view,'cards');
      const {page,pageSize,sourceId,since,until}=options.query;
      const filtered=items.filter(x=>(!sourceId||x.sourceId===sourceId)&&x.publishedAt>=since&&x.publishedAt<=until);
      return {items:filtered.slice((page-1)*pageSize,page*pageSize),total:filtered.length};
    }
    if(path.endsWith('/metrics/latest')) throw Object.assign(new Error('older server'),{status:404});
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

test('analysis distinguishes missing snapshots from measured but ordinary performance',async()=>{
  const items=[1,2,3,4].map(id=>row(id,'0','标题'));
  const args=['--source','甲'];
  assert.match(await analyst(api(items),'performance',args,now),/没有可用的阅读量快照/);
  const snapshots=Object.fromEntries(items.map(a=>[a.id,[{readNum:100,capturedAt:now}]]));
  assert.match(await analyst(api(items,snapshots),'performance',args,now),/没有文章达到同号基准/);
});
test('performance includes an uncapped control article near the baseline',async()=>{
  const items=[1,2,3,4].map(id=>row(id,'0','样本'+id));
  const snapshots=Object.fromEntries([500,90,100,110].map((readNum,i)=>[i+1,[{readNum,capturedAt:now}]]));
  const r=await analyst(api(items,snapshots),'performance',['--source','甲','--format','json'],now);
  assert.equal(r.highlights[0].baselineExample.id,3);
  assert.equal(r.highlights[0].baselineExample.readNum,100);
});

test('a full account sample uses one metric request and keeps measured zeros',async()=>{
  const items=Array.from({length:50},(_,i)=>row(i+1,'0','样本'));
  const legacy=api(items);
  let batches=0;
  const client={request(path,options){
    if(path.endsWith('/metrics/latest')){
      batches++;
      assert.equal(options.query.ids.split(',').length,50);
      return {items:{1:{capturedAt:now,readNum:0}}};
    }
    assert.ok(!path.includes('/metrics/'));
    return legacy.request(path,options);
  }};
  const data=await analyst(client,'performance',['--source','甲',...json],now);
  assert.equal(batches,1);
  assert.equal(data.coverage[0].measured,1);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('local CLI runs all five tasks on a collection export with no login', async()=>{
  const dir=await mkdtemp(join(tmpdir(),'irss-local-'));
  try {
    const file=join(dir,'文章 集合.json');
    const now=Date.now()-3600000;
    const iso=new Date(now).toISOString().slice(0,10);
    const rows=[500,100,110,90,80].map((readNum,i)=>({
      title:i===0?'相机夜拍固件升级':'相机评测 '+i,sourceTitle:i===4?'乙':'甲',
      originalUrl:'https://example.org/'+i,publishedAt:now,
      snapshots:[{readNum,capturedAt:now+1000}],
    }));
    await writeFile(file,'\uFEFF'+JSON.stringify({name:'参照组',items:[...rows,rows[0]]}));
    const cli=(mode,...args)=>JSON.parse(execFileSync(process.execPath,['bin/ai-rss.mjs','local',mode,file,...args,'--format','json'],{encoding:'utf8',stdio:'pipe'}));
    const search=cli('search','--keyword','相机','--keyword','夜拍','--match','all');
    assert.equal(search.matched,1);
    assert.deepEqual(search.input,{type:'local-file',rows:6,articles:5,sources:2});
    assert.equal(cli('brief','--date',iso,'--timezone','UTC','--keyword','夜拍').matched,1);
    assert.equal(cli('compare','--source','甲','--source','乙','--from',iso,'--to',iso,'--timezone','UTC').matched,5);
    assert.equal(cli('peers','--source','甲').recommendations[0].title,'乙');
    const r=cli('performance','--source','甲');
    assert.equal(r.highlights[0].multiple,5);
    assert.deepEqual(r.warnings,[]);
    await writeFile(file,JSON.stringify([{...rows[0],publishedAt:'bad'}]));
    assert.throws(()=>cli('brief'),e=>e.stderr.includes('第 1 条文章'));
  } finally { await rm(dir,{recursive:true,force:true}); }
});
import { csvArticles } from '../src/csv-articles.mjs';

test('spreadsheet imports handle quoted Chinese text, empty metrics and observed zero',()=>{
  const csv='公众号,标题,发布时间,摘要,阅读量,观测时间\r\n甲,"相机,""夜拍""",2026-11-18T10:00:00+08:00,"第一行\n第二行",0,2026-11-18T12:00:00+08:00\r\n乙,快讯,2026-11-18T09:00:00+08:00,,,';
  const [a,b]=csvArticles(csv);
  assert.equal(a.title,'相机,"夜拍"');
  assert.equal(a.summary,'第一行\n第二行');
  assert.equal(a.snapshots[0].readNum,0);
  assert.equal(b.snapshots,undefined);
  assert.throws(()=>csvArticles(csv+',多余列'),/列数/);
  assert.throws(()=>csvArticles(csv.replace('0,2026-11-18T12:00:00+08:00','0,')),/同时提供/);
});

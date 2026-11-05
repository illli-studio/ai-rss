import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, controlPath } from '../src/client.mjs';
import { markdownReport } from '../src/report.mjs';

const key = 'wmt_ai_'+'a'.repeat(43);

test('only sends the key to the configured API origin and rejects redirects', async () => {
  let calls = 0;
  const api = createClient({baseUrl:'https://example.test',key,transport:async (url,options)=>{
    calls++;
    assert.equal(url.href,'https://example.test/api/v1/ai/status');
    assert.equal(options.headers.Authorization,'Bearer '+key);
    assert.equal(options.redirect,'error');
    return Response.json({workspace:'test'});
  }});
  await assert.rejects(api.request('https://other.test/api/v1/ai/status'),/超出/);
  assert.equal(calls,0);
  assert.deepEqual(await api.request(controlPath+'/status'),{workspace:'test'});
  assert.throws(()=>createClient({baseUrl:'http://example.test',key}),/HTTPS/);
});

test('export keeps source attribution and links and marks missing bodies', () => {
  const output=markdownReport('竞品',[{id:1,title:'新品发布',sourceTitle:'品牌号',publishedAt:1700000000000,
    originalUrl:'https://mp.weixin.qq.com/s/example',contentStatus:'missing'}]);
  assert.match(output,/品牌号/);
  assert.match(output,/https:\/\/mp\.weixin\.qq\.com\/s\/example/);
  assert.match(output,/正文未归档/);
  assert.doesNotMatch(markdownReport('测试',[{title:'假链接',originalUrl:'javascript:alert(1)'}]),/javascript:/);
});

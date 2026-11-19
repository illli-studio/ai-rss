import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const cli = fileURLToPath(new URL('../bin/ai-rss.mjs', import.meta.url));

test('add by shared article and choose a previous name-search result', async (t) => {
  const requests = [];
  const server = createServer(async (request,response) => {
    let body='';
    for await (const chunk of request) body+=chunk;
    requests.push([request.method,request.url,body ? JSON.parse(body) : null]);
    const items=[{nickname:'同名',fakeid:'MP_WXS_1'},{nickname:'同名',fakeid:'MP_WXS_2'}];
    const article=body.includes('https://mp.weixin.qq.com');
    const result=request.url==='/api/v1/search' ? {job_id:article?'article':'name',queryType:article?'article':'name'} :
      request.method==='GET' ? {kind:'search',status:'succeeded',result:{results:request.url.endsWith('article')?items.slice(0,1):items}} : {ok:true};
    response.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));
  });
  server.listen(0,'127.0.0.1');
  t.after(() => server.close());
  await once(server,'listening');
  const env = {...process.env,AI_RSS_URL:`http://127.0.0.1:${server.address().port}`,
    AI_RSS_KEY:'wmt_ai_'+'a'.repeat(43)};
  const call = (...args) => run(process.execPath,[cli,...args],{env});

  await call('source','add','分享 https://mp.weixin.qq.com/s/abc');
  await assert.rejects(call('source','add','同名'), err=>err.code===2 && JSON.parse(err.stdout).items[1].pick===2);
  await call('source','add','--job','name','--pick','2');
  await assert.rejects(call('source','add','--job','name','--pick','3'),/范围/);
  assert.equal(requests.filter(r=>r[1]==='/api/v1/search').length,2);
  assert.deepEqual(requests.filter(r=>r[1]==='/open-api/subscriptions').map(r=>r[2].fakeid),['MP_WXS_1','MP_WXS_2']);
});

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const cli = fileURLToPath(new URL('../bin/ai-rss.mjs', import.meta.url));

test('delete commands require confirmation and send one request per deletion', async (t) => {
  const requests = [];
  const server = createServer(async (request,response) => {
    let body='';
    for await (const chunk of request) body+=chunk;
    requests.push([request.method,request.url,body ? JSON.parse(body) : null]);
    const result=request.method==='GET' ? {ids:[42,43]} : {ok:true};
    response.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));
  });
  server.listen(0,'127.0.0.1');
  t.after(() => server.close());
  await once(server,'listening');
  const env = {...process.env,AI_RSS_URL:`http://127.0.0.1:${server.address().port}`,
    AI_RSS_KEY:'wmt_ai_'+'a'.repeat(43)};
  const call = (...args) => run(process.execPath,[cli,...args],{env});

  await assert.rejects(call('source','delete','MP_WXS_123'),/--yes/);
  await assert.rejects(call('article','delete','42'),/--yes/);
  await assert.rejects(call('article','delete','42','43'),/--yes/);
  await assert.rejects(call('article','delete','-1','--yes'));
  await assert.rejects(call('article','delete','42','invalid','--yes'),/文章 ID/);
  await assert.rejects(call('article','delete',...Array.from({length:101},(_,i)=>String(i+1)),'--yes'),/100/);
  await assert.rejects(call('article','delete','--all'),/--yes/);
  await assert.rejects(call('article','delete','42','--all','--yes'),/不能与文章 ID/);
  await assert.rejects(call('article','delete','--all','--source=','--yes'),/缺少 --source/);
  assert.deepEqual(requests,[]);
  assert.deepEqual(JSON.parse((await call('source','delete','MP_WXS_123','--yes')).stdout),{ok:true});
  assert.deepEqual(JSON.parse((await call('article','delete','42','--yes')).stdout),{ok:true});
  assert.deepEqual(JSON.parse((await call('source','delete','MP_WXS_123','MP_WXS_456','--yes')).stdout),{ok:true});
  assert.deepEqual(JSON.parse((await call('article','delete','42','43','42','--yes')).stdout),{ok:true});
  assert.deepEqual(JSON.parse((await call('article','delete','--all','--source','MP_WXS_123','--yes')).stdout),{ok:true});
  assert.deepEqual(requests,[['DELETE','/api/v1/subscriptions/MP_WXS_123/purge',null],
    ['DELETE','/api/v1/articles/42',null],
    ['POST','/api/v1/subscriptions/batch-delete',{ids:['MP_WXS_123','MP_WXS_456']}],
    ['POST','/api/v1/articles/batch-delete',{ids:[42,43]}],
    ['GET','/api/v1/articles?sourceId=MP_WXS_123&idsOnly=1',null],
    ['POST','/api/v1/articles/batch-delete',{ids:[42,43]}]]);
});

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const cli = fileURLToPath(new URL('../bin/ai-rss.mjs', import.meta.url));

test('delete commands require confirmation and send scoped DELETE requests', async (t) => {
  const requests = [];
  const server = createServer((request,response) => {
    requests.push([request.method,request.url]);
    response.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({ok:true}));
  });
  server.listen(0,'127.0.0.1');
  t.after(() => server.close());
  await once(server,'listening');
  const env = {...process.env,AI_RSS_URL:`http://127.0.0.1:${server.address().port}`,
    AI_RSS_KEY:'wmt_ai_'+'a'.repeat(43)};
  const call = (...args) => run(process.execPath,[cli,...args],{env});

  await assert.rejects(call('source','delete','MP_WXS_123'),/--yes/);
  await assert.rejects(call('article','delete','42'),/--yes/);
  await assert.rejects(call('article','delete','-1','--yes'));
  assert.deepEqual(requests,[]);
  assert.deepEqual(JSON.parse((await call('source','delete','MP_WXS_123','--yes')).stdout),{ok:true});
  assert.deepEqual(JSON.parse((await call('article','delete','42','--yes')).stdout),{ok:true});
  assert.deepEqual(requests,[['DELETE','/api/v1/subscriptions/MP_WXS_123/purge'],
    ['DELETE','/api/v1/articles/42']]);
});

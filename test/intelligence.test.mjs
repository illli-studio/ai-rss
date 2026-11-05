import test from 'node:test';
import assert from 'node:assert/strict';
import { intelligenceCommand } from '../src/intelligence.mjs';

test('reads live price and never calls paid metrics over the user budget', async (t) => {
  t.mock.method(globalThis,'fetch',async (url, options)=>{
    assert.match(url,/^https:\/\/api\.we-media\.cn\/api\/v1\/products/);
    assert.equal(options.method,'GET');
    return Response.json({code:'OK',data:{items:[{slug:'wechat-native-article-metrics',
      priceMicros:15000,currency:'CNY',billingUnit:'request'}]}});
  });
  const saved=process.env.MANGYUN_API_KEY;
  process.env.MANGYUN_API_KEY='test-fixture';
  try {
    const api={request:async()=>({articleId:123,originalUrl:'https://mp.weixin.qq.com/s/demo'})};
    await assert.rejects(intelligenceCommand(api,'metrics','refresh',['--articles','123','--max-cost','0.01']),/超过/);
    assert.equal(fetch.mock.callCount(),1);
  } finally {
    if (saved===undefined) delete process.env.MANGYUN_API_KEY;
    else process.env.MANGYUN_API_KEY=saved;
  }
});

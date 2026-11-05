import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { controlPath } from './client.mjs';

const API=controlPath+'/intelligence';
const MANGYUN='https://api.we-media.cn';
const PRODUCT='wechat-native-article-metrics';
const fields=['readNum','likeNum','oldLikeNum','shareNum','commentNum','collectNum'];
const str={type:'string'}, bool={type:'boolean'};
const argsOf=(args,count,options={})=>{
  const {positionals,values}=parseArgs({args,options,allowPositionals:true});
  if (positionals.length!==count) throw new Error('参数数量不正确，请运行 ai-rss --help。');
  return [positionals[0],values];
};
const csv=(value)=>[...new Set((value??'').split(/[,，]/).map(x=>x.trim()).filter(Boolean))];
const int=(value,min,max,label)=>{
  const n=Number(value);
  if (!Number.isSafeInteger(n)||n<min||n>max) throw new Error(label+'范围为 '+min+'–'+max);
  return n;
};
const secret=(name)=>{
  const value=process.env[name]?.trim();
  if (!value) throw new Error('请在运行环境设置 '+name+'；不要把凭据放在命令或聊天里。');
  return value;
};
const fmt=(value)=>{
  if (value!==undefined&&!['markdown','json'].includes(value)) throw new Error('--format 支持 markdown 或 json');
  return value??'markdown';
};

function money(value) {
  if (typeof value!=='string'||!/^(?:0|[1-9]\d{0,5})(?:\.\d{1,6})?$/.test(value)) throw new Error('--max-cost 需为人民币金额，最多六位小数');
  const [integer,frac='']=value.split('.');
  return Number(integer)*1e6+Number(frac.padEnd(6,'0'));
}

async function mangyun(path,{key,body,id,transport=fetch}={}) {
  let resp;
  try {
    resp=await transport(MANGYUN+path,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(45_000),
      headers:{'X-API-Key':key,'User-Agent':'ai-rss-cli','Accept':'application/json',
        ...(body?{'Content-Type':'application/json','Idempotency-Key':id}:{})},
      body:body?JSON.stringify(body):undefined});
  } catch { throw new Error('无法连接曼格云；如果已发出付费请求，请先查消费记录再重试。'); }
  const data=await resp.json().catch(()=>null);
  if (!resp.ok||data?.code!=='OK') throw new Error('曼格云请求未成功（HTTP '+resp.status+'），请检查权限、余额和调用记录。');
  return data;
}

async function quote(key,count) {
  const catalog=await mangyun('/api/v1/products?search='+encodeURIComponent('公众号文章互动数据')+'&pageSize=20',{key});
  const product=catalog.data?.items?.find(x=>x.slug===PRODUCT);
  const unitMicros=Number(product?.priceMicros);
  if (!product||product.currency!=='CNY'||product.billingUnit!=='request'||
      !Number.isSafeInteger(unitMicros)||unitMicros<0) {
    throw new Error('无法取得当前人民币单次报价，未发起付费请求。');
  }
  return {provider:'mangyun',requests:count,currency:'CNY',unitMicros,estimateMicros:unitMicros*count};
}

function validLink(value) {
  try {
    const url=new URL(value);
    return url.origin==='https://mp.weixin.qq.com'&&!url.username&&!url.password&&/^\/s(?:\/|$)/.test(url.pathname);
  } catch { return false; }
}

export async function intelligenceCommand(api,group,action,args) {
  const get=(path,query)=>api.request(API+path,{query});
  const send=(path,method,body)=>api.request(API+path,{method,body});
  switch (group+' '+action) {
    case 'intel list':
      argsOf(args,0); return get('/rules');
    case 'intel create': {
      const [name,v]=argsOf(args,1,{monitor:str,preset:str,at:str,timezone:str,exclude:str,'ima-base':str,'ima-folder':str,feishu:bool,'clear-destinations':bool});
      if (!v.monitor) throw new Error('请用 --monitor 指定监控组');
      const body={name,monitor:v.monitor,preset:v.preset,at:v.at,timezone:v.timezone,exclude:csv(v.exclude),clearDestinations:v['clear-destinations']};
      if (v['ima-folder']&&!v['ima-base']) throw new Error('--ima-folder 需要 --ima-base');
      if (v['ima-base']) body.ima={base:v['ima-base'],folder:v['ima-folder']??v['ima-base'],
        clientId:secret('IMA_OPENAPI_CLIENTID'),key:secret('IMA_OPENAPI_APIKEY')};
      if (v.feishu) body.feishu={url:secret('AI_RSS_FEISHU_WEBHOOK'),secret:process.env.AI_RSS_FEISHU_SECRET??''};
      return send('/rules','PUT',body);
    }
    case 'intel run':
    case 'intel pause':
    case 'intel resume':
    case 'intel delete': {
      const [name]=argsOf(args,1);
      return send('/rules/action','POST',{name,action});
    }
    case 'intel analyze': {
      const [name,v]=argsOf(args,1,{days:str,format:str});
      const mode=fmt(v.format);
      const result=await send('/analyze','POST',{name,days:v.days===undefined?7:int(v.days,1,90,'天数')});
      return mode==='json'?result:result.markdown;
    }
    case 'intel feed': {
      const [name]=argsOf(args,1);
      const result=await get('/feed',{name});
      if (!/^\/feed\/intelligence\/[A-Za-z0-9_-]{43}$/.test(result.path)) throw new Error('报告 Feed 地址无效');
      return {name,url:api.origin+result.path};
    }
    case 'report list': {
      const [name]=argsOf(args,1);
      return get('/reports',{name});
    }
    case 'report show': {
      const [id,v]=argsOf(args,1,{format:str});
      const mode=fmt(v.format);
      const result=await get('/reports/'+int(id,1,Number.MAX_SAFE_INTEGER,'报告 ID'));
      return mode==='json'?result:result.markdown;
    }
    case 'report retry': {
      const [id]=argsOf(args,1);
      return send('/reports/'+int(id,1,Number.MAX_SAFE_INTEGER,'报告 ID')+'/retry','POST',{});
    }
    case 'metrics quote': {
      const [,v]=argsOf(args,0,{count:str});
      return quote(secret('MANGYUN_API_KEY'),int(v.count,1,20,'文章数'));
    }
    case 'metrics history': {
      const [id]=argsOf(args,1);
      const result=await get('/metrics/'+int(id,1,Number.MAX_SAFE_INTEGER,'文章 ID'));
      const [now,before]=result.items;
      const readDelta=now&&before&&!now.readCapped&&!before.readCapped&&Number.isInteger(now.readNum)&&Number.isInteger(before.readNum)
        ?now.readNum-before.readNum:null;
      return {...result,readDelta};
    }
    case 'metrics refresh': {
      const [,v]=argsOf(args,0,{articles:str,'max-cost':str});
      const ids=csv(v.articles).map(x=>int(x,1,Number.MAX_SAFE_INTEGER,'文章 ID'));
      int(ids.length,1,20,'文章数');
      const max=money(v['max-cost']);
      const key=secret('MANGYUN_API_KEY');
      const articles=[];
      for (const id of ids) {
        const article=await get('/metrics/'+id);
        if (!validLink(article.originalUrl)) throw new Error('文章 '+id+' 没有可用的公开原文链接，未发起付费请求。');
        articles.push(article);
      }
      const pricing=await quote(key,articles.length);
      if (pricing.estimateMicros>max) throw new Error('当前报价超过 --max-cost，未发起付费请求。');
      const items=[];
      let spent=0,uncertain=false;
      for (const article of articles) {
        if (spent+pricing.unitMicros>max) break;
        try {
          const result=await mangyun('/openapi/'+PRODUCT+'/articles/metrics',
            {key,body:{url:article.originalUrl},id:randomUUID()});
          const consumption=Number(result.consumption);
          if (result.consumption===null||result.consumption===undefined||!Number.isFinite(consumption)||consumption<0) {
            uncertain=true;
            throw new Error('接口未返回可核对的消费金额，请查消费明细。');
          }
          spent+=Math.round(consumption*1e6);
          const data=result.data??{};
          const stamp=Date.parse(data.capturedAt);
          const snapshot={provider:'mangyun',capturedAt:Number.isFinite(stamp)?stamp:Date.now(),readCapped:data.readCapped===true};
          for (const name of fields) snapshot[name]=Number.isSafeInteger(data[name])&&data[name]>=0?data[name]:null;
          await send('/metrics/'+article.articleId,'POST',snapshot);
          items.push({articleId:article.articleId,...snapshot});
        } catch (error) {
          uncertain=true;
          items.push({articleId:article.articleId,error:error.message});
          break;
        }
      }
      return {...pricing,spentMicros:spent,costUncertain:uncertain,partial:uncertain||items.length<articles.length,items};
    }
    default: throw new Error('未知命令。请运行 ai-rss --help。');
  }
}

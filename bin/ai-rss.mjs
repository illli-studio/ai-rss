#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { setTimeout as wait } from 'node:timers/promises';
import { controlPath as AI } from '../src/client.mjs';
import { activeClient, login, logout } from '../src/login.mjs';
import { markdownReport } from '../src/report.mjs';
import { intelligenceCommand } from '../src/intelligence.mjs';
import pkg from '../package.json' with { type: 'json' };

const HELP = `ai-rss — 微信公众号订阅文章自动化

  ai-rss login [--url 站点地址] [--no-browser] 在浏览器确认后登录
  ai-rss logout [--local-only]              退出本机并撤销此次登录的密钥
  ai-rss status                            验证密钥与实例
  ai-rss overview                          查看采集账号、订阅与任务状态
  ai-rss audit                             查看最近的 AI 操作
  ai-rss source list
  ai-rss source search <公众号名称或文章链接>
  ai-rss source add <公众号名称或文章链接>
  ai-rss source add --fakeid ID --title 名称
  ai-rss source pause <订阅ID>
  ai-rss source resume <订阅ID>
  ai-rss source delete <订阅ID> [订阅ID ...] --yes
  ai-rss source interval <订阅ID> --minutes <分钟>
  ai-rss fetch run --source <订阅ID,订阅ID>
  ai-rss job status|cancel|retry <任务ID>
  ai-rss job wait <任务ID> [--timeout 秒]
  ai-rss article list [--source ID] [--keyword 词] [--days 天] [--page 页] [--limit 篇]
  ai-rss article show <文章ID>
  ai-rss article star|unstar <文章ID>
  ai-rss article delete <文章ID> [文章ID ...] --yes
  ai-rss monitor list
  ai-rss monitor create <名称> --sources <订阅ID,订阅ID> [--keywords <词,词>]
  ai-rss monitor check <名称> [--new | --days 天] [--limit 篇] [--offset 篇]
  ai-rss monitor delete <名称>
  ai-rss collection list
  ai-rss collection save <名称> --from-monitor <监控名> [--new | --days 天] [--limit 篇] [--offset 篇]
  ai-rss collection save <名称> --articles <文章ID,文章ID>
  ai-rss collection remove <名称> --article <文章ID>
  ai-rss collection delete <名称>
  ai-rss collection export <名称> [--format markdown|json]
  ai-rss intel create <名称> --monitor <监控组> [--preset ai-tech] [--at 09:00] [--timezone Asia/Shanghai]
                       [--exclude 词,词] [--ima-base ID] [--ima-folder ID] [--feishu] [--clear-destinations]
  ai-rss intel list
  ai-rss intel run|pause|resume|delete <名称>
  ai-rss intel analyze <名称> [--days 天] [--format markdown|json]
  ai-rss intel feed <名称>
  ai-rss report list <规则名称>
  ai-rss report show <报告ID> [--format markdown|json]
  ai-rss report retry <报告ID>
  ai-rss metrics quote --count <篇数>
  ai-rss metrics refresh --articles <文章ID,文章ID> --max-cost <人民币金额>
  ai-rss metrics history <文章ID>

使用 ai-rss login 登录，或同时设置 AI_RSS_URL、AI_RSS_KEY。不要把密钥放在命令参数里。
除 Markdown 导出和帮助信息外，操作结果输出为 JSON。`;

const str = { type: 'string' }, bool = { type: 'boolean' };
const id = encodeURIComponent;
const jobPath = (value) => '/api/v1/jobs/'+id(value);
const parse = (args, count, options = {}) => {
  const { values, positionals } = parseArgs({ args, options, allowPositionals: true, strict: true });
  if (positionals.length !== count) throw new Error('参数数量不正确，请运行 ai-rss --help。');
  return [positionals[0], values];
};
const required = (value, option) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('缺少 --'+option);
  return value.trim();
};
const csv = (value) => [...new Set(String(value ?? '').split(/[,，]/).map((part)=>part.trim()).filter(Boolean))];
const number = (value, min, max, label) => {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result<min || result>max) throw new Error(label+' 应为 '+min+'–'+max+' 的整数');
  return result;
};
const startTime = (days) => days === undefined ? undefined : Date.now()-number(days,1,3650,'天数')*86_400_000;
const deletionIds = (args,{label,max,warning,normalize}) => {
  const { values,positionals }=parseArgs({args,options:{yes:bool},allowPositionals:true,strict:true});
  if (!values.yes) throw new Error(warning+'核对目标 ID 后加 --yes 执行。');
  const ids=[...new Set(positionals.map(normalize))];
  if (!ids.length || ids.length>max) throw new Error(label+'每次须提供 1–'+max+' 个 ID。');
  return ids;
};
const output = (data) => console.log(typeof data === 'string' ? data : JSON.stringify(data,null,2));
const opt = (method, body) => ({ method, body });
const checkOptions = (v) => {
  if (v.new && (v.days !== undefined || v.offset !== undefined)) throw new Error('--new 不能与 --days 或 --offset 同时使用');
  return { new: v.new ?? false, since: startTime(v.days),
    limit: v.limit === undefined ? undefined : number(v.limit,1,100,'篇数'),
    offset: v.offset === undefined ? undefined : number(v.offset,0,1_000_000,'偏移量') };
};

async function waitForJob(api, jobId, timeout = 90) {
  const end = Date.now()+timeout*1000;
  while (true) {
    const job = await api.request(jobPath(jobId));
    if (job.status === 'succeeded') return job;
    if (['failed','cancelled'].includes(job.status)) throw new Error('任务 '+jobId+'：'+(job.error || job.status));
    if (Date.now() >= end) throw new Error('任务 '+jobId+' 尚未完成，可用 job status 继续查询。');
    await wait(1800);
  }
}

async function main([group, action, ...args]) {
  if (!group || group === '--help' || group === '-h') return output(HELP);
  if (group === '--version') return output(pkg.version);
  if (group === 'login') {
    const [,v]=parse(action?[action,...args]:[],0,{url:str,'no-browser':bool});
    return output(await login({url:v.url,noBrowser:v['no-browser']}));
  }
  if (group === 'logout') {
    const [,v]=parse(action?[action,...args]:[],0,{'local-only':bool});
    return output(await logout({localOnly:v['local-only']}));
  }
  const api = await activeClient();
  if (['intel','report','metrics'].includes(group)) {
    const result=await intelligenceCommand(api,group,action,args);
    if (result?.partial && group==='metrics') process.exitCode=1;
    return output(result);
  }
  const get = (path, query) => api.request(path, { query });
  const send = (path, method, body) => api.request(path, opt(method, body));
  switch (group+' '+(action ?? '')) {
    case 'status ': {
      const result=await get(AI+'/status');
      if (result.membership?.active===false) {
        result.billingUrl=api.origin+'/dashboard#billing';
        process.stderr.write('体验期或会员已到期。开通或续费：'+result.billingUrl+'\n');
      }
      return output(result);
    }
    case 'overview ': return output(await get('/api/v1/overview'));
    case 'audit ': return output(await get(AI+'/audit'));
    case 'source list': parse(args,0); return output(await get('/open-api/subscriptions'));
    case 'source search':
    case 'source add': {
      const manual = action==='add' && args.some((x)=>/^--(?:fakeid|title)(?:=|$)/.test(x));
      const [query,v] = parse(args,manual ? 0 : 1,action === 'add' ? { fakeid:str,title:str } : {});
      if (v.fakeid || v.title) {
        return output(await send('/open-api/subscriptions','POST',{ fakeid:required(v.fakeid,'fakeid'), title:required(v.title,'title') }));
      }
      const { job_id } = await send('/api/v1/search','POST',{ keyword:query });
      const job = await waitForJob(api,job_id);
      const candidates = job.result?.results ?? [];
      if (action === 'search') return output({ jobId:job_id, items:candidates });
      const matches = query.startsWith('https://mp.weixin.qq.com/') ? candidates : candidates.filter((item)=>item.nickname === query);
      if (matches.length !== 1) {
        output({ jobId:job_id, items:candidates, message:'未能唯一确认公众号。请按搜索结果用 --fakeid 和 --title 指定。' });
        process.exitCode=2;
        return;
      }
      return output(await send('/open-api/subscriptions','POST',{ ...matches[0], title:matches[0].nickname }));
    }
    case 'source pause':
    case 'source resume': {
      const [source] = parse(args,1);
      return output(await send('/api/v1/subscriptions/batch','POST',{ ids:[source],action }));
    }
    case 'source delete': {
      const ids=deletionIds(args,{label:'删除订阅',max:400,
        warning:'删除订阅也会删除该公众号的全部归档文章。如需保留归档，请使用 source pause。',
        normalize:value=>{
          if (!value.trim() || value.length>40) throw new Error('订阅 ID 无效，请使用 source list 返回的 ID。');
          return value;
        }});
      return output(ids.length===1
        ? await send('/api/v1/subscriptions/'+id(ids[0])+'/purge','DELETE')
        : await send('/api/v1/subscriptions/batch-delete','POST',{ids}));
    }
    case 'source interval': {
      const [source,v]=parse(args,1,{minutes:str});
      return output(await send('/api/v1/subscriptions/'+id(source),'PATCH',
        {interval_minutes:number(v.minutes,1,1440,'采集间隔')}));
    }
    case 'fetch run': {
      const [,v] = parse(args,0,{ source:str });
      const sources = csv(required(v.source,'source'));
      if (!sources.length || sources.length>400) throw new Error('每次可提交 1–400 个订阅 ID。');
      const { accepted, failed } = await send('/api/v1/subscriptions/batch','POST',{ ids:sources,action:'fetch' });
      const items = [...accepted,...failed].map(({ id:sourceId,...result })=>({ sourceId,...result }));
      if (failed.length) process.exitCode=1;
      return output({ items });
    }
    case 'job status':
    case 'job cancel':
    case 'job retry':
    case 'job wait': {
      const [job,v] = parse(args,1,action==='wait' ? { timeout:str } : {});
      if (action==='wait') return output(await waitForJob(api,job,v.timeout===undefined ? 90 : number(v.timeout,1,600,'超时秒数')));
      if (action==='cancel') return output(await send(jobPath(job),'DELETE'));
      if (action==='retry') return output(await send(jobPath(job)+'/retry','POST',{}));
      return output(await get(jobPath(job)));
    }
    case 'article list': {
      const [,v] = parse(args,0,{ source:str,keyword:str,days:str,page:str,limit:str });
      return output(await get('/open-api/articles',{ sourceId:v.source,q:v.keyword,since:startTime(v.days),
        page:v.page===undefined ? undefined : number(v.page,1,1_000_000,'页码'),
        pageSize:v.limit===undefined ? 20 : number(v.limit,1,100,'篇数') }));
    }
    case 'article show': {
      const [article] = parse(args,1);
      return output(await get('/api/v1/articles/'+number(article,1,Number.MAX_SAFE_INTEGER,'文章 ID')));
    }
    case 'article delete': {
      const ids=deletionIds(args,{label:'删除文章',max:100,warning:'删除后，后续采集不会重新归档这些链接。',
        normalize:value=>number(value,1,Number.MAX_SAFE_INTEGER,'文章 ID')});
      return output(ids.length===1
        ? await send('/api/v1/articles/'+ids[0],'DELETE')
        : await send('/api/v1/articles/batch-delete','POST',{ids}));
    }
    case 'article star':
    case 'article unstar': {
      const [article] = parse(args,1);
      return output(await send('/api/v1/articles/'+number(article,1,Number.MAX_SAFE_INTEGER,'文章 ID')+'/state',
        'POST',{ starred:action==='star' }));
    }
    case 'monitor list': parse(args,0); return output(await get(AI+'/monitors'));
    case 'monitor create': {
      const [name,v] = parse(args,1,{ sources:str,keywords:str });
      return output(await send(AI+'/monitors','PUT',{ name,sourceIds:csv(required(v.sources,'sources')),keywords:csv(v.keywords) }));
    }
    case 'monitor delete': {
      const [name] = parse(args,1);
      return output(await send(AI+'/monitors','DELETE',{ name }));
    }
    case 'monitor check': {
      const [name,v] = parse(args,1,{ new:bool,days:str,limit:str,offset:str });
      return output(await send(AI+'/monitors/check','POST',{ name,...checkOptions(v) }));
    }
    case 'collection list': parse(args,0); return output(await get(AI+'/collections'));
    case 'collection save': {
      const [name,v] = parse(args,1,{ 'from-monitor':str,articles:str,new:bool,days:str,limit:str,offset:str });
      if (Boolean(v['from-monitor']) === Boolean(v.articles)) throw new Error('请选择 --from-monitor 或 --articles。');
      if (v['from-monitor']) return output(await send(AI+'/collections','POST',{ name,monitor:v['from-monitor'],...checkOptions(v) }));
      if (v.new || v.days !== undefined || v.limit !== undefined || v.offset !== undefined) throw new Error('筛选参数只适用于 --from-monitor。');
      const articleIds=csv(v.articles).map((a)=>number(a,1,Number.MAX_SAFE_INTEGER,'文章 ID'));
      if (!articleIds.length) throw new Error('请填写至少一个文章 ID。');
      return output(await send(AI+'/collections','POST',{ name,articleIds }));
    }
    case 'collection remove':
    case 'collection delete': {
      const [name,v] = parse(args,1,action==='remove'?{ article:str }:{});
      const articleId = action==='remove' ? number(required(v.article,'article'),1,Number.MAX_SAFE_INTEGER,'文章 ID') : undefined;
      return output(await send(AI+'/collections','DELETE',{ name,articleId }));
    }
    case 'collection export': {
      const [name,v] = parse(args,1,{ format:str });
      const format=v.format ?? 'markdown';
      if (!['markdown','json'].includes(format)) throw new Error('--format 支持 markdown 或 json');
      const items=[];
      for (let offset=0; ; offset+=100) {
        const page=await get(AI+'/collections/articles',{ name,offset });
        items.push(...page.items);
        if (!page.hasMore) break;
      }
      return output(format==='json'?{ name,items }:markdownReport(name,items));
    }
    default: throw new Error('未知命令。请运行 ai-rss --help。');
  }
}

main(process.argv.slice(2)).catch((error)=>{
  process.stderr.write(JSON.stringify({ error:error.message,status:error.status,code:error.code,billingUrl:error.billingUrl })+'\n');
  process.exitCode=1;
});

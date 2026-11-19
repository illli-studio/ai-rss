import { parseArgs } from 'node:util';
import { escape, safeLink } from './report.mjs';

const day = 86_400_000;
const string = { type: 'string' };
const multiple = { type: 'string', multiple: true };
const signals = [
  ['价格与促销', /调价|降价|涨价|优惠|折扣|促销|限时价|售价/],
  ['产品动态', /新品|发布|上市|上线|预售|升级/],
  ['渠道与活动', /门店|渠道|开业|活动|合作|展会/],
];

export function integer(value, min, max, label) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(label+'须为 '+min+'–'+max+' 的整数');
  return n;
}

// Find local midnight by calendar date, including 23- and 25-hour days.
export function dateWindow(date, timezone, now) {
  const format = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit' });
  date ??= format.format(now);
  const utc = Date.parse(date+'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(utc) || new Date(utc).toISOString().slice(0,10)!==date)
    throw new Error('日期须为有效的 YYYY-MM-DD');
  function boundary(target, epoch) {
    let low=epoch-day, high=epoch+day;
    while (low<high) {
      const mid=Math.floor((low+high)/2);
      if (format.format(mid)<target) low=mid+1;
      else high=mid;
    }
    return low;
  }
  const since=boundary(date,utc);
  const tomorrow=new Date(utc+day).toISOString().slice(0,10);
  return { date, timezone, since, until:boundary(tomorrow,utc+day)-1 };
}

export function selectSources(all, selectors) {
  if (!selectors.length) return all;
  const selected=new Map();
  for (const selector of selectors) {
    const exact=all.find(s=>s.id===selector);
    const found=exact?[exact]:all.filter(s=>s.title===selector);
    if (!found.length) throw new Error('未找到订阅「'+selector+'」，请先用 source list 核对。');
    if (found.length>1) throw new Error('存在同名订阅，请用 ID 指定：'+found.map(s=>s.id).join('、'));
    selected.set(found[0].id,found[0]);
  }
  return [...selected.values()];
}

function excerpt(text, offset) {
  const start=Math.max(0,offset-45);
  return (start?'…':'')+text.slice(start,start+180)+(text.length>start+180?'…':'');
}

function evidence(article, terms, mode) {
  const title=article.title||'';
  const body=(article.contentMarkdown||'').replace(/\s+/g,' ').trim();
  const text=(title+' '+body).toLowerCase();
  const matches=terms.filter(term=>text.includes(term.toLowerCase()));
  if (terms.length&&!matches.length) return null;
  const offset=matches.map(term=>body.toLowerCase().indexOf(term.toLowerCase())).find(i=>i>=0);
  const result={id:article.id,title,sourceId:article.sourceId,sourceTitle:article.sourceTitle,
    publishedAt:article.publishedAt,originalUrl:article.originalUrl,contentStatus:article.contentStatus,
    excerpt:offset!==undefined?excerpt(body,offset):excerpt(article.excerpt||article.summary||body,0)};
  if (terms.length) result.matchedKeywords=matches;
  if (mode==='compare') {
    result.signals=signals.filter(([,pattern])=>pattern.test(text)).map(([label])=>label);
    if (offset===undefined) {
      const location=body.search(new RegExp(signals.map(([,pattern])=>pattern.source).join('|')));
      if (location>=0) result.excerpt=excerpt(body,location);
    }
  }
  return result;
}

export async function archiveWorkflow(api, mode, args, now=Date.now()) {
  if (!['search','brief','compare'].includes(mode)) throw new Error('请选择 archive search、brief 或 compare');
  const options={source:multiple,limit:string,format:string};
  if (mode==='brief') Object.assign(options,{date:string,timezone:string});
  else Object.assign(options,{keyword:multiple,days:string});
  const {values:v}=parseArgs({args,options,strict:true,allowPositionals:false});
  if (v.format && !['markdown','json'].includes(v.format)) throw new Error('格式须为 markdown 或 json');
  const limit=integer(v.limit??10,1,100,'展示篇数');
  const terms=[...new Set((v.keyword??[]).map(word=>word.trim()))];
  if (terms.some(t=>!t||t.length>200)) throw new Error('关键词长度须为 1–200 个字符');
  if (mode==='compare'&&!v.source?.length) throw new Error('请用 --source 指定要跟踪的订阅，可重复传入');
  const window=mode==='brief'?dateWindow(v.date,v.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone,now):
    {since:v.days===undefined&&mode==='search'?undefined:now-integer(v.days??7,1,3650,'天数')*day,until:now};
  const all=(await api.request('/open-api/subscriptions')).items;
  const sources=selectSources(all,v.source??[]);
  const groups=new Map(sources.map(s=>[s.id,{id:s.id,title:s.title,enabled:Boolean(s.enabled),
    lastSuccess:s.last_success,lastError:s.last_error,archiveCount:s.article_count,jobStatus:s.job_status,
    ...(mode==='compare'?{signalCounts:{}}:{}),matched:0,articles:[]}]));
  const seen=new Set();
  const newest=(a,b)=>b.publishedAt-a.publishedAt||b.id-a.id;
  const top=[];
  // Retain only the newest requested evidence; count all distinct matches.
  function retain(list,item) {
    list.push(item);
    list.sort(newest);
    if (list.length>limit) list.pop();
  }
  const scopes=v.source?.length?sources.map(s=>s.id):[undefined];
  for (const sourceId of sources.length?scopes:[]) {
    for (const q of terms.length?terms:[undefined]) {
      for (let page=1;;page++) {
        const query={sourceId,q,since:window.since,until:window.until,page,pageSize:100};
        const data=await api.request('/open-api/articles',{query});
        for (const article of data.items) {
          const group=groups.get(article.sourceId);
          if (!group||seen.has(article.id)) continue;
          const item=evidence(article,terms,mode);
          if (!item) continue;
          seen.add(item.id);
          group.matched++;
          if (mode==='compare') {
            for (const label of item.signals) group.signalCounts[label]=(group.signalCounts[label]??0)+1;
          }
          retain(mode==='search'?top:group.articles,item);
        }
        if (data.items.length<100||page*100>=data.total) break;
      }
    }
  }
  if (mode==='brief') {
    // Include different accounts before taking a second story from the same one.
    for (let index=0;top.length<limit;index++) {
      const batch=[...groups.values()].map(group=>group.articles[index]).filter(Boolean).sort(newest);
      if (!batch.length) break;
      top.push(...batch.slice(0,limit-top.length));
    }
  }
  const coverage=[...groups.values()].map(({articles,...source})=>mode==='compare'?{...source,articles}:source);
  const result={window,matched:seen.size,coverage,...(mode==='compare'?{}:{articles:top})};
  return v.format==='json'?result:renderArchive(mode,result);
}

function renderArchive(mode,{window,matched,coverage,articles}) {
  const timezone=window.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:timezone,dateStyle:'short'});
  const period=window.date??((window.since?fmt.format(window.since):'最早归档')+' 至 '+fmt.format(window.until));
  const names={search:'微信公众号文章搜索',brief:'微信公众号每日简报',compare:'微信公众号竞品监控'};
  const shown=articles?.length??coverage.reduce((n,s)=>n+s.articles.length,0);
  const lines=['# '+names[mode], '',period+'（'+timezone+'） · '+coverage.length+' 个订阅 · 命中 '+matched+' 篇 · 展示 '+shown+' 篇',''];
  if (!coverage.length) lines.push('当前工作空间还没有订阅。可提供公众号名称或一篇文章链接开始采集。');
  function entry(item) {
    const url=safeLink(item.originalUrl);
    const title=escape(item.title);
    lines.push('- '+(url?'['+title+'](<'+url+'>)':title)+' · '+escape(item.sourceTitle)+' · '+fmt.format(item.publishedAt));
    if (item.signals?.length) lines.push('  线索：'+item.signals.join('、'));
    if (item.excerpt) lines.push('  '+escape(item.excerpt));
    if (item.contentStatus!=='complete') lines.push('  正文未完整归档，细节请核对原文。');
  }
  if (articles) articles.forEach(entry);
  for (const s of coverage) {
    if (mode==='compare') {
      lines.push('', '## '+escape(s.title)+' · '+s.matched+' 篇','');
      const counts=Object.entries(s.signalCounts).map(([label,n])=>label+' '+n+' 篇');
      if (counts.length) lines.push('关键词线索（可重叠）：'+counts.join('，')+'。','');
      s.articles.forEach(entry);
    }
    const issues=[];
    if (!s.enabled) issues.push('已暂停采集');
    if (s.lastError) issues.push('最近采集错误：'+escape(s.lastError));
    if (s.jobStatus) issues.push('采集任务：'+escape(s.jobStatus));
    if (!s.lastSuccess) issues.push('暂无成功采集记录');
    if (s.archiveCount===0) issues.push('还没有归档文章');
    if (issues.length) lines.push('',escape(s.title)+'：'+issues.join('，')+'。');
    else if (!s.matched) lines.push('',escape(s.title)+'：当前范围没有匹配的归档文章。');
  }
  return lines.join('\n');
}

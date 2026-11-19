import { escape, safeLink } from './report.mjs';

const day = 86_400_000;
const string = { type: 'string' };
const multiple = { type: 'string', multiple: true };
const signals = [
  ['价格与促销', /调价|降价|涨价|优惠|折扣|促销|限时价|售价|起售价|指导价|上市定价|保险补贴|购车补贴|置换补贴/],
  ['产品动态', /新品|发布|上市|上线|预售|升级/],
  ['渠道与活动', /门店|渠道|开业|活动|合作|展会/],
];

const signalPattern=new RegExp(signals.map(([,pattern])=>pattern.source).join('|'));

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

// Resolve inclusive calendar dates in the reader's timezone.
function archiveWindow(mode,v,now) {
  const timezone=v.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (mode==='brief') return dateWindow(v.date,timezone,now);
  if (v.from!==undefined || v.to!==undefined) {
    if (v.days!==undefined) throw new Error('--days 与 --from/--to 请择一使用');
    const since=v.from===undefined?undefined:dateWindow(v.from,timezone,now).since;
    const until=v.to===undefined?now:dateWindow(v.to,timezone,now).until;
    if (since!==undefined && since>until) throw new Error('开始日期晚于结束日期');
    return {since,until,timezone};
  }
  return {since:v.days===undefined&&mode==='search'?undefined:now-integer(v.days??7,1,3650,'天数')*day,until:now,timezone};
}

export function selectSources(all, selectors, localFile=false) {
  if (!selectors.length) return all;
  const selected=new Map();
  for (const selector of selectors) {
    const exact=all.find(s=>s.id===selector);
    const found=exact?[exact]:all.filter(s=>s.title===selector);
    if (!found.length) {
      const available=all.slice(0,5).map(s=>s.title).join('、');
      const scope=available?'已覆盖来源：'+available+(all.length>5?'等 '+all.length+' 个':'')+'。':'当前来源为空。';
      const next=localFile?'请核对文件里的公众号名称，或补充该号材料。':'可提供该号的一篇微信原文链接来识别来源。';
      throw new Error('当前范围没有「'+selector+'」。'+scope+next);
    }
    if (found.length>1) throw new Error('存在同名订阅，请用 ID 指定：'+found.map(s=>s.id).join('、'));
    selected.set(found[0].id,found[0]);
  }
  return [...selected.values()];
}

function excerpt(text, offset) {
  const start=Math.max(0,offset-45);
  return (start?'…':'')+text.slice(start,start+180)+(text.length>start+180?'…':'');
}

function evidence(article, terms, mode, requestedPattern) {
  const title=article.title||'';
  const searchLinks=terms.some(term=>/^https?:\/\//i.test(term));
  function readable(text) {
    if (!searchLinks) text=text.replace(/!?\[([^\]\n]*)\]\([^\s)]*\)/g,'$1').replace(/https?:\/\/[^\s<>)]+/gi,' ');
    return text.replace(/\s+/g,' ').trim();
  }
  const body=readable(article.contentMarkdown||'');
  const summary=readable([article.summary,article.excerpt].filter(Boolean).join(' '));
  const text=[title,body,summary].join(' ').toLowerCase();
  const matches=terms.filter(term=>text.includes(term.toLowerCase()));
  if (terms.length&&!matches.length) return null;
  const offset=matches.map(term=>body.toLowerCase().indexOf(term.toLowerCase())).find(i=>i>=0);
  const summaryOffset=terms.map(term=>summary.toLowerCase().indexOf(term.toLowerCase())).find(i=>i>=0);
  const result={id:article.id,title,sourceId:article.sourceId,sourceTitle:article.sourceTitle,
    publishedAt:article.publishedAt,originalUrl:article.originalUrl,contentStatus:article.contentStatus,
    excerpt:offset!==undefined?excerpt(body,offset):summaryOffset!==undefined?excerpt(summary,summaryOffset):excerpt(readable(article.excerpt||article.summary||body),0)};
  if (mode==='compare' && signals[0][1].test(text)) {
    result.priceEvidence = [
      ['补贴或优惠权益', /补贴|优惠券|返现|赠送/],
      ['限时促销', /限时价|限时优惠|折扣|促销/],
      ['官方标价', /指导价|官方售价|上市定价|起售价/],
      ['调价表述', /调价|降价|涨价/],
    ].filter(([,pattern])=>pattern.test(text)).map(([label])=>label);
  }
  if (terms.length) result.matchedKeywords=matches;
  if (mode==='compare') {
    result.signals=signals.filter(([,pattern])=>pattern.test(text)).map(([label])=>label);
    if (requestedPattern || offset===undefined) {
      const pattern=requestedPattern??signalPattern;
      const location=body.search(pattern);
      if (location>=0) result.excerpt=excerpt(body,location);
      else if (pattern.test(summary)) result.excerpt=excerpt(summary,summary.search(pattern));
    }
  }
  return result;
}

export async function archiveWorkflow(api, mode, args, now=Date.now()) {
  if (!['search','brief','compare'].includes(mode)) throw new Error('请选择 archive search、brief 或 compare');
  const options={source:multiple,limit:string,format:string,timezone:string,keyword:multiple};
  if (mode==='brief') Object.assign(options,{date:string});
  else Object.assign(options,{days:string,from:string,to:string});
  if (mode==='search') Object.assign(options,{match:string,sort:string});
  if (mode==='compare') Object.assign(options,{signal:string,previous:{type:'boolean'}});
  const v=Array.isArray(args)?(await import('node:util')).parseArgs({args,options,strict:true,allowPositionals:false}).values:args;
  if (v.match!==undefined && !['any','all'].includes(v.match)) throw new Error('--match 须为 any 或 all');
  if (v.format && !['markdown','json'].includes(v.format)) throw new Error('格式须为 markdown 或 json');
  const signalLabels={price:'价格与促销',product:'产品动态',channel:'渠道与活动'};
  if (v.signal!==undefined && !Object.hasOwn(signalLabels,v.signal)) throw new Error('--signal 须为 price、product 或 channel');
  const requestedPattern=signals.find(([label])=>label===signalLabels[v.signal])?.[1];
  if (v.sort!==undefined && !['latest','relevance'].includes(v.sort)) throw new Error('--sort 须为 latest 或 relevance');
  const limit=integer(v.limit??10,1,100,'展示篇数');
  const terms=[...new Set((v.keyword??[]).map(word=>word.trim()))];
  if (terms.some(t=>!t||t.length>200)) throw new Error('关键词长度须为 1–200 个字符');
  if (mode==='compare'&&!v.source?.length) throw new Error('请用 --source 指定要跟踪的订阅，可重复传入');
  const window=v._window??archiveWindow(mode,v,now);
  const all=(await api.request('/open-api/subscriptions')).items;
  const sources=selectSources(all,v.source??[],api.localFile);
  const groups=new Map(sources.map(s=>[s.id,{id:s.id,title:s.title,enabled:Boolean(s.enabled),
    ...(s.localFile?{localFile:true}:{}),lastSuccess:s.last_success,lastError:s.last_error,archiveCount:s.article_count,jobStatus:s.job_status,
    ...(mode==='compare'?{signalCounts:{}}:{}),matched:0,articles:[]}]));
  const seen=new Set();
  const newest=(a,b)=>b.publishedAt-a.publishedAt||b.id-a.id;
  function rank(a,b) {
    if (v.sort==='relevance') {
      const coverage=(b.matchedKeywords?.length??0)-(a.matchedKeywords?.length??0);
      return coverage || b.titleMatches-a.titleMatches || newest(a,b);
    }
    if (mode==='compare') return Number(Boolean(b.signals.length))-Number(Boolean(a.signals.length)) || newest(a,b);
    return newest(a,b);
  }
  const top=[];
  const stories=new Map();
  // Retain only the newest requested evidence; count all distinct matches.
  function retain(list,item) {
    list.push(item);
    list.sort(rank);
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
          const item=evidence(article,terms,mode,requestedPattern);
          if (!item || (v.match==='all' && terms.length>0 && item.matchedKeywords.length!==terms.length)) continue;
          if (v.signal && !item.signals.includes(signalLabels[v.signal])) continue;
          if (v.sort==='relevance') {
            const title=item.title.toLowerCase();
            item.titleMatches=terms.filter(t=>title.includes(t.toLowerCase())).length;
          }
          seen.add(item.id);
          group.matched++;
          if (mode==='compare') {
            for (const label of item.signals) group.signalCounts[label]=(group.signalCounts[label]??0)+1;
          }
          if (mode==='brief') {
            const key=safeLink(item.originalUrl)||'article:'+item.id;
            const story=stories.get(key);
            if (story) {
              if (!story.sources.includes(item.sourceTitle)) story.sources.push(item.sourceTitle);
              continue;
            }
            item.sources=[item.sourceTitle];
            stories.set(key,item);
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
  if (mode==='compare' && v.previous) {
    if (!window.since) throw new Error('对比上一期需要指定起始日期或天数');
    const duration=window.until-window.since+1;
    const previous=await archiveWorkflow(api,mode,{...v,previous:false,format:'json',
      _window:{since:window.since-duration,until:window.since-1,timezone:window.timezone}},now);
    result.previous={window:previous.window,coverage:previous.coverage};
  }
  if (mode==='brief') result.uniqueStories=stories.size;
  if (v.sort) result.sort=v.sort;
  if (v.signal) result.signal=signalLabels[v.signal];
  if (mode==='brief') result.linkedShown=top.filter(a=>safeLink(a.originalUrl)).length;
  return v.format==='json'?result:renderArchive(mode,result,terms,api.localFile);
}

function renderArchive(mode,{window,matched,coverage,articles,sort,signal,linkedShown,uniqueStories,previous},terms,localFile) {
  const timezone=window.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:timezone,dateStyle:'short'});
  const period=window.date??((window.since?fmt.format(window.since):'最早归档')+' 至 '+fmt.format(window.until));
  const names={search:'微信公众号文章搜索',brief:'微信公众号每日简报',compare:'微信公众号竞品监控'};
  const shown=articles?.length??coverage.reduce((n,s)=>n+s.articles.length,0);
  const lines=['# '+names[mode], '',period+'（'+timezone+'） · '+coverage.length+' 个订阅 · 命中 '+matched+' 篇 · 展示 '+shown+' 篇',''];
  if (sort==='relevance') lines.push('按命中词数、标题命中数、发布时间依次排序。','');
  if (signal) lines.push('仅统计含「'+signal+'」线索的文章。','');
  if (mode==='brief' && shown) lines.push('按文章发布日期收录，事件发生日期请以原文为准。','');
  if (mode==='brief' && shown) lines.push('本次展示中 '+linkedShown+' / '+shown+' 篇附原文链接。','');
  if (!coverage.length) lines.push(localFile?'这份文件没有文章，请提供含文章的清单。':'当前工作空间还没有订阅。可提供公众号名称或一篇文章链接开始采集。');
  function entry(item) {
    const url=safeLink(item.originalUrl);
    const title=escape(item.title);
    lines.push('- '+(url?'['+title+'](<'+url+'>)':title)+' · '+escape(item.sourceTitle)+' · '+fmt.format(item.publishedAt));
    if (item.sources?.length>1) lines.push('  同一原文收录于：'+item.sources.map(escape).join('、'));
    if (item.matchedKeywords?.length) lines.push('  命中词：'+item.matchedKeywords.map(escape).join('、'));
    if (item.signals?.length) lines.push('  线索：'+item.signals.join('、'));
    if (item.priceEvidence?.length) lines.push('  价格依据：'+item.priceEvidence.join('、')+'。核对车型或版本、时间和条件后再比较。');
    if (item.excerpt) lines.push('  '+escape(item.excerpt));
    if (item.contentStatus!=='complete') lines.push('  正文未完整归档，细节请核对原文。');
  }
  if (mode==='brief' && coverage.length) {
    const active=coverage.filter(s=>s.matched).length;
    lines.push((terms.length?'命中主题的订阅：':'有更新的订阅：')+active+' / '+coverage.length+' 个。'+'合并相同原文后共 '+uniqueStories+' 条。'+(uniqueStories>shown?'另有 '+(uniqueStories-shown)+' 篇未展开。':''),'');
  }
  if (mode==='search' && coverage.length && !matched) lines.push(localFile?'可缩短关键词、扩大日期范围，或补充材料。':'可缩短关键词、扩大日期范围，或查看下方采集状态。');
  if (articles) articles.forEach(entry);
  for (const s of coverage) {
    if (mode==='compare') {
      lines.push('', '## '+escape(s.title)+' · '+s.matched+' 篇','');
      const counts=Object.entries(s.signalCounts).map(([label,n])=>label+' '+n+' 篇');
      if (counts.length) lines.push('关键词线索（可重叠）：'+counts.join('，')+'。','');
      s.articles.forEach(entry);
      if (previous) {
        const prior=previous.coverage.find(p=>p.id===s.id);
        lines.push('','上一期 '+fmt.format(previous.window.since)+' 至 '+fmt.format(previous.window.until)+' · '+(prior?.matched??0)+' 篇。');
        for (const [label] of signals) lines.push(label+'线索：上期 '+(prior?.signalCounts[label]??0)+' 篇，本期 '+(s.signalCounts[label]??0)+' 篇。');
        prior?.articles.forEach(entry);
      }
    }
    if (s.localFile) continue;
    const issues=[];
    if (!s.enabled) issues.push('已暂停采集');
    if (s.lastError) issues.push('最近采集错误：'+escape(s.lastError));
    if (s.jobStatus) issues.push('采集任务：'+escape(s.jobStatus));
    if (!s.lastSuccess) issues.push('暂无成功采集记录');
    if (s.archiveCount===0) issues.push('还没有归档文章');
    if (issues.length) lines.push('',escape(s.title)+'：'+issues.join('，')+'。');
    else if (!s.matched && mode!=='brief') lines.push('',escape(s.title)+'：当前范围没有匹配的归档文章。');
  }
  return lines.join('\n');
}

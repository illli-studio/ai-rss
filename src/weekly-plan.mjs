import { parseArgs } from 'node:util';
import { integer, selectSources } from './archive-workflows.mjs';
import { keywords, readArchive } from './analyst.mjs';
import { escape, safeLink } from './report.mjs';

const day=86400000;

function nextMonday(now,timezone) {
  const local=new Intl.DateTimeFormat('sv-SE',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const midnight=Date.parse(local+'T00:00:00Z');
  return midnight+(8-(new Date(midnight).getUTCDay()||7))*day;
}

function similarity(a,b) {
  let shared=0;
  for (const t of a) if (b.has(t)) shared++;
  return shared/Math.max(1,a.size+b.size-shared);
}

function angle(title,index) {
  if (/测评|对比|评测|比较/.test(title)) return ['选择指南','比较文中涉及的方案，说明各自适用的读者和选择条件'];
  if (/政策|规定|新规|通知/.test(title)) return ['影响解读','从原文提取适用对象、具体变化和读者需要核对的事项'];
  if (/教程|实操|步骤|入门/.test(title)) return ['实践清单','把参考文章中的做法整理成读者可执行的步骤，并指出实施条件'];
  return [
    ['读者问答','围绕原文主题提出读者最关心的问题，用原文能够支持的信息逐一回答'],
    ['案例拆解','从原文选一个具体例子，解释做法、条件以及可以借鉴的部分'],
    ['核查清单','把原文涉及的判断拆成读者可以自行核查的问题'],
    ['入门导读','从读者第一次接触这个话题的角度梳理背景、术语和下一步'],
  ][index%4];
}

export async function weeklyPlan(api,args,now=Date.now()) {
  const str={type:'string'};
  const {values:v}=parseArgs({args,options:{source:{...str,multiple:true},topic:str,days:str,posts:str,timezone:str,format:str}});
  if (!v.source?.length) throw new Error('请先用 source list 选择参考公众号，再传 --source 名称或 ID');
  const posts=integer(v.posts??7,1,7,'每周篇数');
  const days=integer(v.days??30,1,365,'回看天数');
  const timezone=v.timezone??'Asia/Shanghai';
  const monday=nextMonday(now,timezone);
  const dateAt=offset=>new Date(monday+offset*day).toISOString().slice(0,10);
  const topic=v.topic?.trim();
  if (v.topic!==undefined&&!topic) throw new Error('主题不能为空');
  if (v.format&&!['markdown','json'].includes(v.format)) throw new Error('格式须为 markdown 或 json');
  const sources=selectSources((await api.request('/open-api/subscriptions')).items,v.source);
  const window={since:now-days*day,until:now};
  const coverage=[],pool=[],seenLinks=new Set();
  for(const source of sources) {
    const {items,total}=await readArchive(api,source.id,window);
    let usable=0;
    for(const a of items) {
      const url=safeLink(a.originalUrl);
      if (!url||!a.title?.trim()) continue;
      if (topic&&!(a.title+' '+a.summary).toLowerCase().includes(topic.toLowerCase())) continue;
      usable++;
      if (seenLinks.has(url)) continue;
      seenLinks.add(url);
      pool.push({...a,sourceTitle:source.title,originalUrl:url,terms:keywords(a.title)});
    }
    coverage.push({id:source.id,title:source.title,total,usable,lastError:source.last_error,
      enabled:Boolean(source.enabled),lastSuccess:source.last_success});
  }
  // Pick distinct stories, balancing recency and representation of reference accounts.
  const plan=[],used=new Set(),counts=new Map();
  while(plan.length<posts) {
    let best,score=-Infinity;
    for(const item of pool) {
      if(used.has(item)) continue;
      const recency=(item.publishedAt-window.since)/(days*day);
      const priority=recency-0.7*(counts.get(item.sourceId)||0);
      if(priority>score) {best=item;score=priority;}
    }
    if(!best) break;
    const cluster=pool.filter(a=>!used.has(a)&&(a===best||
      best.title.trim().toLowerCase()===a.title.trim().toLowerCase()||similarity(best.terms,a.terms)>=0.55));
    for(const item of cluster) used.add(item);
    const second=cluster.find(a=>a.sourceId!==best.sourceId);
    counts.set(best.sourceId,(counts.get(best.sourceId)||0)+1);
    const [label,approach]=angle(best.title,plan.length);
    const evidence=(second?[best,second]:[best]).map(({terms,...article})=>article);
    const published=new Intl.DateTimeFormat('zh-CN',{timeZone:timezone,month:'long',day:'numeric'}).format(best.publishedAt);
    const attribution=best.sourceTitle+'于'+published+'发布《'+best.title+'》';
    const reason=second?attribution+'，'+second.sourceTitle+'也发布了《'+second.title+'》。适合把两篇原文放在一起，辨别共同判断和各自关注点。':
      attribution+'。建议用“'+label+'”切入：'+approach+'。';
    const frames={'选择指南':'哪些差异会影响你的选择？','影响解读':'哪些人需要调整做法？',
      '实践清单':'第一次尝试要准备什么？','读者问答':'读者最值得先问什么？',
      '案例拆解':'哪些经验可以迁移到自己的场景？','核查清单':'做决定前要核实哪几件事？',
      '入门导读':'初次接触应从哪里看起？'};
    plan.push({angle:label,workingTitle:best.title.replace(/[。！？?!]+$/u,'')+'：'+frames[label],
      approach,reason,evidence});
  }
  plan.forEach((item,i)=>{item.date=dateAt(plan.length===1?0:Math.round(i*6/(plan.length-1)));});
  const result={weekStart:dateAt(0),weekEnd:dateAt(6),timezone,days,requested:posts,topic,coverage,plan};
  if(v.format==='json') return result;
  const lines=['# 微信公众号下周选题计划','',result.weekStart+' 至 '+result.weekEnd+'（'+timezone+'），参考近 '+days+' 天归档。'];
  for(const c of coverage) lines.push('- '+escape(c.title)+'：归档 '+c.total+' 篇，其中 '+c.usable+' 篇符合筛选且有原文。'+(c.lastError?'采集异常：'+escape(c.lastError):''));
  for(const item of plan) {
    lines.push('','## '+item.date+' · '+escape(item.workingTitle),'',escape(item.reason),escape(item.approach));
    for(const a of item.evidence) lines.push('- '+escape(a.sourceTitle)+' · ['+escape(a.title)+'](<'+a.originalUrl+'>)');
  }
  if(plan.length<posts) lines.push('','当前有依据的独立选题共 '+plan.length+' 个，其余档期留空。');
  return lines.join('\n');
}

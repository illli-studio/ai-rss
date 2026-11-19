import { parseArgs } from 'node:util';
import { integer, selectSources } from './archive-workflows.mjs';
import { escape, safeLink } from './report.mjs';

const day = 86400000;
const segmenter = new Intl.Segmenter('zh', {granularity:'word'});
const stop = new Set('我们 你们 他们 以及 这个 那个 今天 昨天 如何 为什么 一个 一种 这些 这篇 文章 公众号 微信 分享 关于 更多 阅读 原文 点击 最新 可以 已经 进行 关注 the and for with from this that'.split(' '));

export function keywords(text) {
  const terms=new Set();
  for (const {segment,isWordLike} of segmenter.segment(text.normalize('NFKC').toLowerCase())) {
    if (isWordLike && segment.length>=2 && !stop.has(segment) && !/^\d+$/.test(segment)) terms.add(segment);
  }
  return terms;
}

function articleRef(a) {
  return {id:a.id,title:a.title,originalUrl:a.originalUrl,publishedAt:a.publishedAt};
}

export async function readArchive(api,sourceId,window,max=Infinity) {
  const seen=new Map();
  let total=0;
  const pageSize=Math.min(max,100);
  for (let page=1; ;page++) {
    const data=await api.request('/open-api/articles',{query:{sourceId,...window,page,pageSize}});
    total=data.total;
    for (const a of data.items) {
      if (seen.size>=max) break;
      seen.set(a.id,{...articleRef(a),sourceId:a.sourceId,summary:(a.summary||a.excerpt||'').slice(0,160)});
    }
    if (seen.size>=max || page*pageSize>=total || data.items.length<pageSize) break;
  }
  return {items:[...seen.values()],total};
}

function profiles(sources,items) {
  const byId=new Map(sources.map(s=>[s.id,{id:s.id,title:s.title,items:[],freq:new Map()}]));
  for (const a of items) {
    const p=byId.get(a.sourceId);
    if (!p) continue;
    const terms=keywords(a.title+' '+a.summary);
    for (const t of terms) p.freq.set(t,(p.freq.get(t)||0)+1);
    p.items.push({article:articleRef(a),terms});
  }
  const active=[...byId.values()].filter(p=>p.items.length);
  const accounts=new Map();
  for (const p of active) for (const t of p.freq.keys()) accounts.set(t,(accounts.get(t)||0)+1);
  for (const p of active) {
    let sum=0;
    for (const [t,n] of p.freq) {
      const weight=n*(1+Math.log((active.length+1)/(accounts.get(t)+1)));
      p.freq.set(t,weight);
      sum+=weight*weight;
    }
    p.norm=Math.sqrt(sum);
  }
  return byId;
}

function peers(sources,items,targetId,days,limit) {
  const accounts=profiles(sources,items);
  const target=accounts.get(targetId);
  const result={target:target.title,targetArticles:target.items.length,accountsScanned:sources.length,recommendations:[]};
  for (const candidate of accounts.values()) {
    if (candidate===target || !candidate.norm || !target.norm) continue;
    const overlap=new Map();
    for (const [term,value] of candidate.freq) {
      if (target.freq.has(term)) overlap.set(term,value*target.freq.get(term));
    }
    if (!overlap.size) continue;
    const dot=[...overlap.values()].reduce((a,b)=>a+b,0);
    const topics=[...overlap.keys()].sort((a,b)=>overlap.get(b)-overlap.get(a)).slice(0,6);
    function examples(profile) {
      return profile.items.map(({article,terms})=>({article,weight:topics.reduce((sum,t)=>sum+(terms.has(t)?overlap.get(t):0),0)}))
        .filter(x=>x.weight>0).sort((a,b)=>b.weight-a.weight||b.article.publishedAt-a.article.publishedAt)
        .slice(0,2).map(x=>x.article);
    }
    result.recommendations.push({id:candidate.id,title:candidate.title,topics,
      similarity:dot/(target.norm*candidate.norm),articles:candidate.items.length,
      weeklyRate:candidate.items.length*7/days,examples:examples(candidate),targetExamples:examples(target)});
  }
  result.recommendations.sort((a,b)=>b.similarity-a.similarity||b.articles-a.articles||a.id.localeCompare(b.id));
  result.recommendations=result.recommendations.slice(0,limit);
  return result;
}

// Compare readings taken at similar ages: first day, days 1–2, 3–6, 7–29, 30+.
function ageBand(ms) {
  return [1,3,7,30,Infinity].findIndex(d=>ms<d*day);
}
const bands=['发布后不足 1 天','发布后 1–3 天','发布后 3–7 天','发布后 7–30 天','发布后至少 30 天'];

async function performance(api,sources,window,sample,limit) {
  const coverage=[],highlights=[];
  for (const s of sources) {
    const {items,total}=await readArchive(api,s.id,window,sample);
    const measured=[];
    for (let i=0;i<items.length;i+=4) {
      const batch=await Promise.all(items.slice(i,i+4).map(async a=>{
        const history=await api.request('/api/v1/ai/intelligence/metrics/'+a.id);
        const snap=history.items.find(x=>Number.isSafeInteger(x.readNum)&&x.readNum>=0&&
          x.capturedAt>=a.publishedAt&&x.capturedAt<=window.until);
        return snap && {...articleRef(a),readNum:snap.readNum,capped:snap.readCapped===true,
          capturedAt:snap.capturedAt,band:ageBand(snap.capturedAt-a.publishedAt)};
      }));
      measured.push(...batch.filter(Boolean));
    }
    let comparable=0, highCount=0;
    for (const a of measured) {
      const peers=measured.filter(b=>b.id!==a.id&&b.band===a.band);
      if (peers.length<3) continue;
      // A censored peer can change the exact median. Only compare when lower
      // and upper bounds agree, including the even-sized median case.
      function median(upper) {
        const nums=peers.map(b=>upper&&b.capped?Infinity:b.readNum).sort((x,y)=>x-y);
        const mid=Math.floor(nums.length/2);
        return nums.length%2?nums[mid]:(nums[mid-1]+nums[mid])/2;
      }
      const baseline=median(false);
      if (!baseline||baseline!==median(true)) continue;
      comparable++;
      if (a.readNum<baseline*2) continue;
      highCount++;
      highlights.push({...a,source:s.title,baseline,peerCount:peers.length,multiple:a.readNum/baseline});
    }
    coverage.push({id:s.id,title:s.title,total,checked:items.length,measured:measured.length,comparable,highCount});
  }
  highlights.sort((a,b)=>b.multiple-a.multiple||b.readNum-a.readNum||b.publishedAt-a.publishedAt);
  return {coverage,highlights:highlights.slice(0,limit)};
}

function link(a) {
  const url=safeLink(a.originalUrl);
  return url?'['+escape(a.title)+'](<'+url+'>)':escape(a.title);
}

export async function analyst(api,action,args,now=Date.now()) {
  if (!['peers','performance'].includes(action)) throw new Error('请选择 analyst peers 或 analyst performance');
  const str={type:'string'};
  const options={source:{...str,multiple:true},days:str,limit:str,format:str};
  if (action==='performance') options.sample=str;
  const {values:v}=parseArgs({args,options});
  const days=integer(v.days??30,1,365,'天数');
  const limit=integer(v.limit??(action==='peers'?5:10),1,100,'展示数量');
  const sample=integer(v.sample??50,1,200,'每号检查篇数');
  if (v.format && !['markdown','json'].includes(v.format)) throw new Error('格式须为 markdown 或 json');
  if (action==='peers'&&v.source?.length!==1) throw new Error('请用 --source 指定一个对标对象，可使用订阅名或 ID');
  const window={since:now-days*day,until:now};
  const sources=(await api.request('/open-api/subscriptions')).items;
  const selected=selectSources(sources,v.source??[]);
  const result=action==='peers'?peers(sources,(await readArchive(api,undefined,window)).items,selected[0].id,days,limit):
    await performance(api,selected,window,sample,limit);
  const warnings=(action==='peers'?sources:selected).filter(s=>s.last_error||!s.last_success||!s.enabled)
    .map(s=>({source:s.title,reason:[s.last_error,!s.last_success?'暂无成功采集记录':'',!s.enabled?'采集已暂停':''].filter(Boolean).join('，')}));
  if (v.format==='json') return {window,days,...result,warnings};
  const lines=['# '+(action==='peers'?'微信公众号对标账号推荐':'微信公众号高表现文章分析'),'','近 '+days+' 天的订阅归档。'];
  if (action==='peers') {
    lines.push('对标对象：'+escape(result.target)+'（'+result.targetArticles+' 篇），检查 '+result.accountsScanned+' 个订阅。');
    for (const r of result.recommendations) lines.push('','## '+escape(r.title),
      '共同选题词：'+r.topics.map(escape).join('、')+'。窗口内 '+r.articles+' 篇，折合每周 '+r.weeklyRate.toFixed(1)+' 篇。'+
      (Math.min(result.targetArticles,r.articles)<3?' 样本少于 3 篇，仅作初步线索。':''),
      '该号代表文章：'+r.examples.map(link).join('、'),'对标对象文章：'+r.targetExamples.map(link).join('、'));
    if (!result.recommendations.length) lines.push('当前归档没有足够的共同选题证据，可扩大时间窗口或补充订阅。');
  } else {
    lines.push('按同账号、相近观测时长比较。阅读量达到至少 3 篇其他文章中位数的 2 倍时入选。');
    for (const c of result.coverage) lines.push('- '+escape(c.title)+'：归档 '+c.total+' 篇，查最近 '+c.checked+' 篇，有阅读量 '+c.measured+' 篇，可比较 '+c.comparable+' 篇，入选 '+c.highCount+' 篇。');
    for (const a of result.highlights) lines.push('','## '+link(a),escape(a.source)+' · '+bands[a.band]+
      ' · 阅读量 '+(a.capped?'至少 ':'')+a.readNum+' · 同号中位数 '+a.baseline+'（'+a.peerCount+' 篇） · '+(a.capped?'至少 ':'')+Number(a.multiple.toFixed(2))+' 倍',
      '发布 '+new Date(a.publishedAt).toISOString()+'，观测 '+new Date(a.capturedAt).toISOString()+'。');
    if (!result.highlights.length) lines.push('没有可确认的高表现文章。请结合上面的归档、快照和可比较篇数判断覆盖情况。');
  }
  for (const w of warnings) lines.push('采集提示：'+escape(w.source)+'，'+escape(w.reason)+'。');
  return lines.join('\n');
}

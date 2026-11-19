const labels = {
  '公众号':'sourceTitle','标题':'title','发布时间':'publishedAt','原文链接':'originalUrl',
  '摘要':'summary','正文':'contentMarkdown','阅读量':'readNum','观测时间':'capturedAt',
  '公众号ID':'sourceId','文章ID':'id',
};

// RFC-style quoted cells, including embedded line breaks and doubled quotes.
export function csvArticles(text) {
  const rows=[];
  let row=[], cell='', quoted=false, closed=false;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (quoted) {
      if (c!=='"') cell+=c;
      else if (text[i+1]==='"') { cell+='"'; i++; }
      else { quoted=false; closed=true; }
    } else if (c===',' || c==='\r' || c==='\n') {
      row.push(cell);
      cell=''; closed=false;
      if (c!==',') {
        if (c==='\r' && text[i+1]==='\n') i++;
        if (row.some(v=>v.trim())) rows.push(row);
        row=[];
      }
    } else if (c==='"' && !cell && !closed) quoted=true;
    else if (c==='"' || closed) throw new Error('CSV 引号格式有误，请从表格重新导出 UTF-8 CSV。');
    else cell+=c;
  }
  if (quoted) throw new Error('CSV 中存在未闭合的引号。');
  row.push(cell);
  if (row.some(v=>v.trim())) rows.push(row);
  const columns=(rows.shift()??[]).map(v=>Object.hasOwn(labels,v.trim())?labels[v.trim()]:v.trim());
  if (!['sourceTitle','title','publishedAt'].every(key=>columns.includes(key)))
    throw new Error('CSV 需要公众号、标题、发布时间三列。');
  if (new Set(columns).size!==columns.length) throw new Error('CSV 表头有重复列。');
  return rows.map((values,i)=>{
    if (values.length!==columns.length) throw new Error('第 '+(i+1)+' 条文章的列数与表头不一致。');
    const a=Object.fromEntries(columns.map((key,j)=>[key,values[j].trim()]));
    if (/^\d{13}$/.test(a.publishedAt)) a.publishedAt=Number(a.publishedAt);
    if (a.readNum || a.capturedAt) {
      if (!/^\d+$/.test(a.readNum??'') || !a.capturedAt) throw new Error('第 '+(i+1)+' 条文章需同时提供整数阅读量和观测时间。');
      a.snapshots=[{readNum:Number(a.readNum),capturedAt:/^\d{13}$/.test(a.capturedAt)?Number(a.capturedAt):a.capturedAt}];
    }
    if (!a.sourceId) delete a.sourceId;
    return a;
  });
}

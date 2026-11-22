import { createHash } from "node:crypto";
import { UFS } from "./state-trends.mjs";
import { isFinancialSearch, normalizeTopic } from "./finance-relevance.mjs";

// Auditoria somente leitura: recupera títulos RSS originais, sem usar o feed derivado.
function getTitles(xml) {
  if (!/<rss(?:\s|>)/i.test(xml)) throw new Error("Não é RSS válido");
  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
  const results = [];
  for (const [, item] of items) {
    const title = /<title>([\s\S]*?)<\/title>/i.exec(item)?.[1] ?? "";
    const date = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(item)?.[1] ?? "";
    const clean = title.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    if (clean) results.push({ title: clean, key: normalizeTopic(clean), date: date.trim() });
  }
  return results;
}
async function query(geo) {
  const url = `https://trends.google.com/trending/rss?geo=${geo}`;
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; InvestSmart-Audit/1.0)", accept: "application/rss+xml" },
    signal: AbortSignal.timeout(18000),
  });
  if (!response.ok) throw new Error(geo + ": HTTP " + response.status);
  const xml = await response.text();
  const items = getTitles(xml);
  const unique = [...new Set(items.map(r => r.key))];
  const hash = createHash("sha256").update(unique.slice().sort().join("|")).digest("hex").slice(0,12);
  return { geo, items, unique, hash, finance: items.filter(r => isFinancialSearch(r.title)).map(r => r.title), finalUrl: response.url };
}
const geos = ["BR", ...UFS.map(uf => "BR-" + uf)];
const responses = [];
for (let i=0; i<geos.length; i+=4) {
  responses.push(...await Promise.all(geos.slice(i,i+4).map(async geo => {
    try { return await query(geo); }
    catch(e) { return { geo, error: String(e) }; }
  })));
}
for (const r of responses) {
  console.log(JSON.stringify({
    geo:r.geo, error:r.error??null, rssItems:r.items?.length??null, distinct:r.unique?.length??null,
    signature:r.hash??null,finance:r.finance??null,top3:r.items?.slice(0,3).map(x=>x.title),
  }));
}
const valid=responses.filter(x=>x.items);
const freq=new Map();
for(const r of valid) {
  for (const key of r.unique) {
    const list=freq.get(key)??[];list.push(r.geo);freq.set(key,list);
  }
}
const overlaps=[...freq.entries()].filter(([t,uf])=>uf.length>1).sort((a,b)=>b[1].length-a[1].length);
const pairwise=[];
for (let i=0; i<valid.length; i++) for (let j=i+1; j<valid.length; j++) {
  const a=new Set(valid[i].unique),b=new Set(valid[j].unique);
  const intersection=[...a].filter(t=>b.has(t)).length;
  const union=new Set([...a,...b]).size;
  const jac=union?intersection/union:0;
  if (jac>=0.8) pairwise.push({a:valid[i].geo,b:valid[j].geo,jaccard:Number(jac.toFixed(2)),intersection,union,identical:jac===1});
}
console.log("AUDIT_SUMMARY "+JSON.stringify({
  checked:valid.length, errors:responses.filter(x=>x.error), allRSSItems:valid.reduce((a,b)=>a+b.items.length,0),
  totalUniqueTerms:freq.size, duplicatedAcrossGeos:overlaps.length,
  frequentlyRepeated:overlaps.slice(0,25).map(([term,ufs])=>({term,ufs})),
  pairsSimilar:pairwise.slice(0,50),
  identicalPairs:pairwise.filter(p=>p.identical).length,
  zeroFinanceStates:valid.filter(x=>x.geo.startsWith("BR-") && x.finance.length===0).length,
}));
if (valid.length < 27) process.exitCode=1;

// Diagnóstico isolado: valida se o RSS público oferece descoberta por UF.
// Não altera feeds de produção nem classifica dados de outras origens como estaduais.
const geos = ["BR", "BR-MG", "BR-BA", "BR-AM", "BR-SP", "BR-RJ"];
const parse = (xml) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
  const v = m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
  return v.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}).filter(Boolean);
for (const geo of geos) {
  try {
    const url = "https://trends.google.com/trending/rss?geo=" + encodeURIComponent(geo);
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; InvestSmartIntelligence/1.0)", accept: "application/rss+xml, application/xml;q=0.9" },
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });
    const body = await response.text();
    const terms = parse(body);
    console.log(JSON.stringify({ geo, status: response.status, finalUrl: response.url, xml: /<rss[\s>]/.test(body), terms: terms.slice(0, 10), count: terms.length }));
  } catch (e) {
    console.log(JSON.stringify({ geo, error: String(e).slice(0, 250) }));
  }
}

// Sonda somente leitura do Google Trends Trending Now por UF.
// Não escreve no feed público nem injeta palavras-chave predefinidas.
const geos = ["BR-SP", "BR-RJ", "BR-MG", "BR-BA", "BR-AM", "BR-AC"];
const WINDOW_HOURS = 168;
for (const geo of geos) {
  try {
    const target = "https://trends.google.com/trending?geo=" +
      encodeURIComponent(geo) + "&hl=pt-BR&hours=" + WINDOW_HOURS;
    const response = await fetch(target, {
      signal: AbortSignal.timeout(25000),
      redirect: "follow",
      headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; InvestSmart-Research/1.0)" },
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const html = await response.text();
    const m = html.match(/AF_initDataCallback\(\{key: 'ds:0', hash: '\d+', data:(\[.*?\]), sideChannel: \{\}\}\);/s);
    if (!m) throw new Error("Bloco de tendências indisponível: " + html.length + " bytes");
    const payload = JSON.parse(m[1]);
    const rows = payload?.[1];
    if (!Array.isArray(rows)) throw new Error("Resposta sem séries");
    const business = rows.filter(r => Array.isArray(r?.[10]) && r[10].includes(3));
    const sample = business.slice(0, 16).map(r => ({
      term: r[0],cat:r[10],traffic:r[6],trendSince:r[3],change:r[8]
    }));
    console.log(JSON.stringify({geo,status:response.status,source:response.url,
      pageItems:rows.length,businessFinance:business.length,sample}));
  } catch (error) {
    console.log(JSON.stringify({geo,error:String(error)}));
  }
}

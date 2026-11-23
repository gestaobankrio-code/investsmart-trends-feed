import { createHash } from "node:crypto";
import { isFinancialSearch, normalizeTopic } from "./finance-relevance.mjs";

export const TRENDING_WINDOW_HOURS = 168;
export const BUSINESS_FINANCE_CATEGORY_ID = 3;
export const PAGE_ORIGIN = "https://trends.google.com/trending";

/** Fonte pública do Google, não API oficial. Falha fechada se o HTML mudar. */
export function trendingPageURL(uf) {
  const url = new URL(PAGE_ORIGIN);
  url.searchParams.set("geo", "BR-" + uf);
  url.searchParams.set("hl", "pt-BR");
  url.searchParams.set("hours", String(TRENDING_WINDOW_HOURS));
  return url;
}

/**
 * Lê apenas o JSON embutido em ds:0; nunca executa JavaScript da página.
 * Os termos são descobertos na resposta da UF, sem lista de palavras de resultado.
 */
export function parseTrendingPage(html, uf) {
  if (typeof html !== "string" || html.length < 100) {
    throw new Error("Página de tendências ausente");
  }
  const match = html.match(
    /AF_initDataCallback\(\{key: 'ds:0', hash: '\d+', data:(\[.*?\]), sideChannel: \{\}\}\);/s,
  );
  if (!match) throw new Error("Google alterou o formato de publicação ds:0; não usar dados estimados");
  const data = JSON.parse(match[1]);
  if (!Array.isArray(data?.[1])) throw new Error("Lista de tendências não encontrada no Google");
  const rows = data[1];
  if (!rows.length) throw new Error("Página de tendências sem registros geográficos");
  const records = new Map();
  const sourceTitles = [];
  let inGoogleCategory = 0;
  for (const row of rows) {
    if (!Array.isArray(row) || typeof row[0] !== "string") {
      throw new Error("Formato de termo alterado pelo Google");
    }
    const title = row[0].trim();
    if (!title || title.length > 150) continue;
    const startedSecs = row[3]?.[0];
    const since = Number.isSafeInteger(startedSecs)
      ? new Date(startedSecs * 1000).toISOString()
      : null;
    const categories = Array.isArray(row[10]) ? row[10] : [];
    sourceTitles.push([normalizeTopic(title), since, [...categories].sort()]);
    if (!categories.includes(BUSINESS_FINANCE_CATEGORY_ID)) continue;
    inGoogleCategory++;
    if (!isFinancialSearch(title) || !since) continue;
    const item = {
      uf,
      termo: title,
      fonte: "Google Trends Trending Now",
      escopo: "tendencia_descoberta_na_uf",
      dataFonte: since,
      urlFonte: trendingPageURL(uf).href,
      geoConsultado: "BR-" + uf,
      interesse: "em_destaque",
      categoriaGoogle: "Negócios e Finanças",
      categoriaGoogleId: BUSINESS_FINANCE_CATEGORY_ID,
      janelaHoras: TRENDING_WINDOW_HOURS,
      volumeBuscaMinimoEstimado: Number.isFinite(row[6]) && row[6] >= 0 ? row[6] : null,
    };
    const key = normalizeTopic(title);
    const prior = records.get(key);
    if (!prior || (prior.dataFonte ?? "") < since) records.set(key, item);
  }
  const signature = createHash("sha256")
    .update(JSON.stringify(sourceTitles.sort((a, b) => a[0].localeCompare(b[0]))))
    .digest("hex")
    .slice(0, 16);
  return {
    totalPagina: rows.length,
    termosCategoriaGoogle: inGoogleCategory,
    assinaturaPagina: signature,
    registros: [...records.values()],
  };
}

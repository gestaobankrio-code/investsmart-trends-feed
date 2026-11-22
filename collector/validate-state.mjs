import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { UFS } from "./state-trends.mjs";
import { isFinancialSearch } from "./finance-relevance.mjs";
const root = resolve(import.meta.dirname, "..");
const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const feed = read("docs/data/state-trends.json");
const status = read("docs/data/state-status.json");
const issues = [];
if (feed.schemaVersion !== 1) issues.push("schemaVersion");
if (!["ok", "parcial", "sem_dados_financeiros"].includes(feed.status)) issues.push("status");
if (feed.totalRegistros === 0 && feed.status !== "sem_dados_financeiros") issues.push("status OK sem termos financeiros");
if (feed.totalRegistros > 0 && feed.status === "sem_dados_financeiros") issues.push("status sem dados incompatível");
if (feed.status !== status.status) issues.push("status e feed divergentes");
if (feed.origemExtracao !== "google_trends_rss_regional") issues.push("fonte estadual");
if (feed.escopoTermos !== "descoberta_estadual_por_geo") issues.push("origem por geo");
if (feed.versaoDados !== status.versaoDados) issues.push("versões divergentes");
if (!Array.isArray(feed.cobertura) || feed.cobertura.length !== 27) issues.push("cobertura das 27 UFs");
const keys = new Set();
for (const row of feed.registros ?? []) {
  if (!UFS.includes(row.uf)) issues.push("UF inválida");
  if (row.geoConsultado !== "BR-" + row.uf) issues.push("geo divergente");
  if (row.escopo !== "tendencia_descoberta_na_uf") issues.push("termo sem evidência estadual");
  if (!isFinancialSearch(row.termo)) issues.push("termo não financeiro: " + row.termo);
  if (row.fonte !== "Google Trends Trending Now") issues.push("fonte inválida");
  try {
    const u = new URL(row.urlFonte);
    if (u.protocol !== "https:" || u.hostname !== "trends.google.com") issues.push("URL não oficial");
  } catch { issues.push("URL inválida"); }
  if (row.dataFonte && !Number.isFinite(Date.parse(row.dataFonte))) issues.push("data da fonte inválida");
  const key = row.uf + "|" + row.termo.toLocaleLowerCase("pt-BR");
  if (keys.has(key)) issues.push("duplicado: " + key);
  keys.add(key);
}
const coverage = new Set();
for (const item of feed.cobertura ?? []) {
  if (!UFS.includes(item.uf) || coverage.has(item.uf)) issues.push("UF duplicada/inesperada na cobertura");
  if (!["com_termos_financeiros", "sem_termos_financeiros_no_recorte", "falha_consulta"].includes(item.status)) {
    issues.push("status da cobertura inválido");
  }
  if (item.status !== "falha_consulta" && !/^[a-f0-9]{16}$/.test(item.assinaturaRss ?? "")) issues.push("assinatura RSS ausente");
  if (item.status === "com_termos_financeiros" && !(item.termosFinanceiros > 0)) issues.push("UF marcada com dados mas sem termos");
  if (item.status === "sem_termos_financeiros_no_recorte" && item.termosFinanceiros !== 0) issues.push("UF vazia inconsistente");
  coverage.add(item.uf);
}
if ((feed.registros ?? []).length !== feed.totalRegistros) issues.push("contagem registros");
if (status.totalRegistros !== feed.totalRegistros) issues.push("contagem status");
if (feed.ufRespondidas < 20 || feed.ufRespondidas > 27) issues.push("cobertura insuficiente");
if (feed.ufRespondidas !== feed.cobertura.filter((x) => x.status !== "falha_consulta").length) issues.push("UFs respondidas divergentes");
if (feed.ufComTermosFinanceiros !== feed.cobertura.filter((x) => x.status === "com_termos_financeiros").length) issues.push("UFs financeiras divergentes");
if (feed.diagnosticoGeografico?.maiorGrupoRssIdentico >= Math.ceil(feed.ufRespondidas * 0.85)) issues.push("respostas RSS replicadas em massa");
if (feed.totalRegistros === 0 && feed.disponibilidadeFinanceira !== "sem_termos_no_recorte") issues.push("disponibilidade financeira incorreta");
if (feed.totalRegistros > 0 && feed.disponibilidadeFinanceira !== "com_resultados") issues.push("disponibilidade financeira incorreta");
if (status.disponibilidadeFinanceira !== feed.disponibilidadeFinanceira) issues.push("disponibilidade feed/status divergente");
if (issues.length) {
  console.error(issues.map((item) => "- " + item).join("\n"));
  process.exit(1);
}
console.log("Feed estadual válido: " + feed.totalRegistros + " termos reais de " +
  feed.ufComTermosFinanceiros + " UFs; " + feed.ufRespondidas + " UFs respondidas.");

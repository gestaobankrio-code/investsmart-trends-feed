import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TERMS_FILE = resolve(ROOT, "collector/terms.json");
const OUT_FILE = resolve(ROOT, "docs/data/trends.json");
const STATUS_FILE = resolve(ROOT, "docs/data/status.json");

const projectId = process.env.GCP_PROJECT_ID;
if (!projectId) throw new Error("GCP_PROJECT_ID não informado.");

const { terms } = JSON.parse(readFileSync(TERMS_FILE, "utf8"));
if (!Array.isArray(terms) || terms.length === 0) throw new Error("collector/terms.json sem termos.");

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const termsSql = terms.map((t) => q(t.toLowerCase())).join(", ");

const TABLES = {
  top: "bigquery-public-data.google_trends.international_top_terms",
  rising: "bigquery-public-data.google_trends.international_top_rising_terms",
};

function bq(table, includeGain = false) {
  const extra = includeGain ? ", SAFE_CAST(percent_gain AS FLOAT64) AS percent_gain" : "";
  const sql = `
    SELECT
      CAST(refresh_date AS STRING) AS refresh_date,
      country_code,
      country_name,
      region_code,
      region_name,
      LOWER(term) AS term,
      SAFE_CAST(score AS FLOAT64) AS score,
      CAST(week AS STRING) AS week,
      SAFE_CAST(rank AS INT64) AS rank
      ${extra}
    FROM \`${table}\`
    WHERE refresh_date = (
      SELECT MAX(refresh_date)
      FROM \`${table}\`
      WHERE country_code = 'BR'
    )
      AND country_code = 'BR'
      AND LOWER(term) IN UNNEST([${termsSql}])
    ORDER BY term, region_code, week
  `;

  const stdout = execFileSync(
    "bq",
    ["query", "--quiet", "--use_legacy_sql=false", "--format=json", `--project_id=${projectId}`, sql],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  const rows = JSON.parse(stdout || "[]");
  if (!Array.isArray(rows)) throw new Error(`Resposta inesperada do BigQuery em ${table}.`);
  return rows;
}

const topRows = bq(TABLES.top, false);
const risingRows = bq(TABLES.rising, true);
if (!topRows.length && !risingRows.length) {
  throw new Error("Nenhum termo curado apareceu no último refresh do Google Trends para BR.");
}

const UF_BY_REGION = new Map([
  ["State of Acre","AC"],["State of Alagoas","AL"],["State of Amapá","AP"],["State of Amazonas","AM"],
  ["State of Bahia","BA"],["State of Ceará","CE"],["Federal District","DF"],["State of Espírito Santo","ES"],
  ["State of Goiás","GO"],["State of Maranhão","MA"],["State of Mato Grosso","MT"],["State of Mato Grosso do Sul","MS"],
  ["State of Minas Gerais","MG"],["State of Pará","PA"],["State of Paraíba","PB"],["State of Paraná","PR"],
  ["State of Pernambuco","PE"],["State of Piauí","PI"],["State of Rio de Janeiro","RJ"],["State of Rio Grande do Norte","RN"],
  ["State of Rio Grande do Sul","RS"],["State of Rondônia","RO"],["State of Roraima","RR"],["State of Santa Catarina","SC"],
  ["State of São Paulo","SP"],["State of Sergipe","SE"],["State of Tocantins","TO"],
]);

function ufOf(row) {
  const code = String(row.region_code ?? "").toUpperCase();
  const m = code.match(/(?:BR[-_])?([A-Z]{2})$/);
  if (m && UF_BY_REGION.has(String(row.region_name ?? ""))) return m[1];
  return UF_BY_REGION.get(String(row.region_name ?? "")) ?? null;
}

function dateAdd(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function groupRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const uf = ufOf(row);
    if (!uf || !row.week || row.score == null) continue;
    const key = `${row.term}::${uf}`;
    const list = map.get(key) ?? [];
    list.push({ ...row, uf });
    map.set(key, list);
  }
  return map;
}

const topGroups = groupRows(topRows);
const risingGroups = groupRows(risingRows);
const topTerms = new Set([...topGroups.values()].flat().map((r) => r.term));
const risingTerms = new Set([...risingGroups.values()].flat().map((r) => r.term));

const selected = terms
  .map((t) => t.toLowerCase())
  .filter((t) => topTerms.has(t) || risingTerms.has(t));

const records = [];

for (const term of selected) {
  const source = topTerms.has(term) ? "Mais buscados" : "Em ascensão";
  const groups = source === "Mais buscados" ? topGroups : risingGroups;

  for (const [key, rows] of groups) {
    if (!key.startsWith(`${term}::`)) continue;
    const weeks = [...new Set(rows.map((r) => r.week))].sort();
    if (!weeks.length) continue;
    const currentWeek = weeks.at(-1);
    const previousWeek = weeks.at(-2) ?? null;
    const currentCandidates = rows.filter((r) => r.week === currentWeek);
    const previousCandidates = previousWeek ? rows.filter((r) => r.week === previousWeek) : [];
    const current = currentCandidates.sort((a,b) => Number(b.refresh_date.localeCompare(a.refresh_date)))[0];
    const previous = previousCandidates[0] ?? null;
    const prev = previous?.score != null ? Number(previous.score) : null;
    const now = current.score != null ? Number(current.score) : null;
    const rank = current.rank != null ? Number(current.rank) : null;
    const gain = current.percent_gain != null ? Number(current.percent_gain) : null;
    const delta = now != null && prev != null ? Math.round((now - prev) * 100) / 100 : null;

    records.push({
      fonte: source,
      termo: term,
      uf: current.uf,
      estado: current.region_name,
      semana: currentWeek,
      dataFonte: current.refresh_date,
      rankNacionalTop25: source === "Mais buscados" ? rank : null,
      indiceAnterior: prev,
      indiceAtual: now,
      variacaoPontos: delta,
      tendencia: delta == null ? "Sem comparação" : delta > 0 ? "Em alta" : delta < 0 ? "Em queda" : "Estável",
      ...(source === "Em ascensão" && gain != null ? { ganhoPercentualFonte: gain } : {}),
    });
  }
}

records.sort((a,b) => a.termo.localeCompare(b.termo, "pt-BR") || a.uf.localeCompare(b.uf));

if (!records.length) throw new Error("A consulta retornou linhas, mas nenhum registro regional válido foi gerado.");

const sourceDates = records.map((r) => r.dataFonte).filter(Boolean).sort();
const weeks = records.map((r) => r.semana).filter(Boolean).sort();
const sourceDate = sourceDates.at(-1);
const weekStart = weeks.at(-1);
const weekEnd = dateAdd(weekStart, 6);
const ufs = new Set(records.map((r) => r.uf));
const actualTerms = [...new Set(records.map((r) => r.termo))].sort((a,b) => a.localeCompare(b, "pt-BR"));
const generatedAt = new Date().toISOString();

const feed = {
  schemaVersion: 1,
  status: "ok",
  geradoEm: generatedAt,
  origemExtracao: "bigquery_live",
  fonteOficial: "Google Trends Public Dataset no BigQuery",
  modo: "dados_reais_parciais",
  semanaInicio: weekStart,
  semanaFim: weekEnd,
  ufsComDados: ufs.size,
  termosComDados: actualTerms.length,
  totalRegistros: records.length,
  termos: actualTerms,
  metodologia: {
    amostra: "Apenas termos financeiros curados presentes no Top 25 ou Top Rising do Google Trends Public Dataset para o Brasil. Cobertura parcial.",
    indice: "Índice relativo 0-100 por termo e região; não representa quantidade absoluta de buscas.",
    variacao: "Diferença em pontos do índice entre as duas semanas mais recentes disponíveis; não é crescimento percentual.",
    ausencias: "UF sem registro não equivale a índice zero.",
    cpc: "Não informado por esta fonte.",
  },
  registros: records,
};

const status = {
  status: "ok",
  ultimaVerificacao: generatedAt,
  ultimaAtualizacao: generatedAt,
  dataFonte: sourceDate,
  semana: weekStart,
  totalRegistros: records.length,
  termos: actualTerms.length,
  ufs: ufs.size,
  origemExtracao: "bigquery_live",
};

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(feed, null, 2) + "\n");
writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2) + "\n");

console.log(JSON.stringify({
  generatedAt,
  sourceDate,
  weekStart,
  weekEnd,
  records: records.length,
  terms: actualTerms.length,
  ufs: ufs.size,
}, null, 2));

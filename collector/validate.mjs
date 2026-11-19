import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const feed = JSON.parse(readFileSync(resolve(ROOT, "docs/data/trends.json"), "utf8"));
const status = JSON.parse(readFileSync(resolve(ROOT, "docs/data/status.json"), "utf8"));

const UFS = new Set(["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]);
const errors = [];

if (feed.schemaVersion !== 1) errors.push("schemaVersion deve ser 1");
if (feed.origemExtracao !== "bigquery_live") errors.push("origemExtracao deve ser bigquery_live");
if (!Array.isArray(feed.registros) || !feed.registros.length) errors.push("feed sem registros");
if (!Array.isArray(feed.termos) || !feed.termos.length) errors.push("feed sem termos");
if (feed.totalRegistros !== feed.registros?.length) errors.push("totalRegistros divergente");
if (feed.termosComDados !== new Set(feed.registros?.map((r) => r.termo)).size) errors.push("termosComDados divergente");
if (feed.ufsComDados !== new Set(feed.registros?.map((r) => r.uf)).size) errors.push("ufsComDados divergente");

const seen = new Set();
for (const r of feed.registros ?? []) {
  if (!UFS.has(r.uf)) errors.push(`UF inválida: ${r.uf}`);
  if (typeof r.termo !== "string" || !r.termo.trim()) errors.push("termo vazio");
  if (!["Mais buscados","Em ascensão","Em ascensao"].includes(r.fonte)) errors.push(`fonte inválida: ${r.fonte}`);
  if (r.indiceAtual != null && (Number(r.indiceAtual) < 0 || Number(r.indiceAtual) > 100)) errors.push(`índice fora de 0-100: ${r.termo}/${r.uf}`);
  if (r.indiceAnterior != null && (Number(r.indiceAnterior) < 0 || Number(r.indiceAnterior) > 100)) errors.push(`índice anterior fora de 0-100: ${r.termo}/${r.uf}`);
  const key = `${r.fonte}::${r.termo}::${r.uf}::${r.semana}`;
  if (seen.has(key)) errors.push(`registro duplicado: ${key}`);
  seen.add(key);
}

if (status.totalRegistros !== feed.totalRegistros) errors.push("status.totalRegistros divergente");
if (status.termos !== feed.termosComDados) errors.push("status.termos divergente");
if (status.ufs !== feed.ufsComDados) errors.push("status.ufs divergente");
if (status.semana !== feed.semanaInicio) errors.push("status.semana divergente");

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}

console.log(`Feed válido: ${feed.totalRegistros} registros, ${feed.termosComDados} termos, ${feed.ufsComDados} UFs.`);

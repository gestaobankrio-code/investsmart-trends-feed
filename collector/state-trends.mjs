import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isFinancialSearch, normalizeTopic } from "./finance-relevance.mjs";
import { parseTrendingPage, trendingPageURL, TRENDING_WINDOW_HOURS } from "./trending-page.mjs";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];
const OUT = resolve(import.meta.dirname, "../docs/data/state-trends.json");
const STATUS = resolve(import.meta.dirname, "../docs/data/state-status.json");
const SOURCE = "https://trends.google.com/trending/rss";
const getTag = (text, tag) => {
  const regex = new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i");
  return regex.exec(text)?.[1] ?? "";
};
function decodeXML(value) {
  return String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([a-f0-9]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&(?:amp|lt|gt|quot|apos);/g, (v) =>
      ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" })[v] ?? v)
    .trim();
}
export function parseStateRSS(xml, uf) {
  if (!UFS.includes(uf)) throw new Error("UF não autorizada");
  if (!/<rss(?:\s|>)/i.test(xml) || !/<channel(?:\s|>)/i.test(xml)) {
    throw new Error("Resposta do Google Trends não é RSS válido");
  }
  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
  const result = [];
  const seen = new Set();
  const titlesFromSource = [];
  for (const [, block] of items) {
    const termo = decodeXML(getTag(block, "title"));
    if (!termo) continue;
    const key = normalizeTopic(termo);
    const rawDate = decodeXML(getTag(block, "pubDate"));
    titlesFromSource.push([key, rawDate]);
    if (termo.length > 150 || !isFinancialSearch(termo)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    const rawLink = decodeXML(getTag(block, "link"));
    let urlFonte = null;
    try {
      const u = new URL(rawLink);
      if (u.protocol === "https:" && u.hostname === "trends.google.com") urlFonte = u.href;
    } catch { /* A URL da consulta da UF permanece disponível no registro. */ }
    const millis = Date.parse(rawDate);
    const dataFonte = Number.isFinite(millis) ? new Date(millis).toISOString() : null;
    result.push({
      uf,
      termo,
      fonte: "Google Trends Trending Now",
      escopo: "tendencia_descoberta_na_uf",
      dataFonte,
      urlFonte: urlFonte ?? SOURCE + "?geo=BR-" + uf,
      geoConsultado: "BR-" + uf,
      interesse: "em_destaque",
    });
  }
  const assinaturaRss = createHash("sha256")
    .update(JSON.stringify(titlesFromSource.sort((a, b) => a[0].localeCompare(b[0]))))
    .digest("hex").slice(0, 16);
  return { totalRSS: items.length, assinaturaRss, registros: result };
}

async function fetchUF(uf) {
  const geo = "BR-" + uf;
  const url = trendingPageURL(uf);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; InvestSmartIntelligence/1.0)",
        accept: "text/html",
      },
      signal: AbortSignal.timeout(27000),
    });
    const responseURL = new URL(res.url);
    if (!res.ok || responseURL.hostname !== "trends.google.com" ||
      responseURL.searchParams.get("geo") !== geo ||
      responseURL.searchParams.get("hours") !== String(TRENDING_WINDOW_HOURS)) {
      throw new Error("HTTP " + res.status + " ou resposta fora da UF/janela solicitadas");
    }
    const parsed = parseTrendingPage(await res.text(), uf);
    return {
      cobertura: {
        uf,
        status: parsed.registros.length ? "com_termos_financeiros" : "sem_termos_financeiros_no_recorte",
        termosNaPagina: parsed.totalPagina,
        termosCategoriaGoogle: parsed.termosCategoriaGoogle,
        assinaturaPagina: parsed.assinaturaPagina,
        termosFinanceiros: parsed.registros.length,
        consultadoEm: new Date().toISOString(),
      },
      registros: parsed.registros,
    };
  } catch (error) {
    return {
      cobertura: {
        uf, status: "falha_consulta", termosNaPagina: null,
        termosCategoriaGoogle: null, assinaturaPagina: null,
        termosFinanceiros: null, consultadoEm: new Date().toISOString(),
        motivo: String(error instanceof Error ? error.message : error).slice(0, 180),
      },
      registros: [],
    };
  }
}

export async function collectStateTrends() {
  const all = [];
  for (let i = 0; i < UFS.length; i += 3) {
    all.push(...await Promise.all(UFS.slice(i, i + 3).map(fetchUF)));
  }
  const success = all.filter((v) => v.cobertura.status !== "falha_consulta").length;
  if (success < 20) {
    throw new Error("Somente " + success + "/27 UFs responderam; feed estadual anterior preservado.");
  }
  const registros = all.flatMap((r) => r.registros).sort(
    (a, b) => a.uf.localeCompare(b.uf) || a.termo.localeCompare(b.termo, "pt-BR"),
  );
  const cobertura = all.map((r) => r.cobertura);
  const geradoEm = new Date().toISOString();
  // Páginas inteiras idênticas em massa entre UFs são suspeitas, mesmo com geo=BR-UF.
  // Repetições de uma palavra isolada entre estados continuam válidas.
  const geoCounts = new Map();
  for (const row of cobertura.filter((x) => x.status !== "falha_consulta")) {
    const signature = row.assinaturaPagina;
    geoCounts.set(signature, (geoCounts.get(signature) ?? 0) + 1);
  }
  const maxIdenticalRSS = Math.max(0, ...geoCounts.values());
  if (maxIdenticalRSS >= Math.ceil(success * 0.85)) {
    throw new Error("Páginas Trending Now praticamente idênticas entre UFs: bloqueada publicação sem comprovação geográfica.");
  }
  const feedStatus = registros.length === 0
    ? "sem_dados_financeiros"
    : success === 27 ? "ok" : "parcial";
  const versaoDados = createHash("sha256")
    .update(JSON.stringify({ cobertura: cobertura.map(({ uf, status, assinaturaPagina }) => ({ uf, status, assinaturaPagina })), registros }))
    .digest("hex").slice(0, 16);
  const feed = {
    schemaVersion: 1,
    status: feedStatus,
    versaoDados, geradoEm,
    origemExtracao: "google_trends_pagina_regional_7d",
    fonteOficial: "Google Trends Trending Now — página pública",
    escopoTermos: "descoberta_estadual_por_geo",
    periodo: "destaques das últimas 168 horas retornados pelo Google para cada UF; não representa todas as buscas",
    ufConsultadas: UFS.length,
    ufRespondidas: success,
    ufComTermosFinanceiros: cobertura.filter((c) => c.status === "com_termos_financeiros").length,
    totalRegistros: registros.length,
    diagnosticoGeografico: { assinaturasPaginaDistintas: geoCounts.size, maiorGrupoPaginaIdentica: maxIdenticalRSS },
    janelaHoras: TRENDING_WINDOW_HOURS,
    disponibilidadeFinanceira: registros.length ? "com_resultados" : "sem_termos_no_recorte",
    cobertura, registros,
    metodologia: {
      selecao: "Cada solicitação consulta a página pública com geo=BR-UF na janela de 168 horas, sem lista fixa de resultados.",
      classificacao: "Somente termos do Google na categoria Negócios e Finanças (id 3) e reconhecidos por regras de pertinência financeira; nenhum termo é fabricado.",
      ausencia: "Trending Now não inclui todas as pesquisas; nenhum termo financeiro na janela não significa demanda financeira zero.",
      temperatura: "O RSS não fornece série temporal comparável; nenhuma temperatura Quente/Morno/Frio é inventada.",
    },
  };
  const status = {
    status: feed.status, versaoDados, ultimaVerificacao: geradoEm,
    origemExtracao: feed.origemExtracao, escopoTermos: feed.escopoTermos,
    ufConsultadas: feed.ufConsultadas, ufRespondidas: success,
    ufComTermosFinanceiros: feed.ufComTermosFinanceiros,
    totalRegistros: registros.length,
    disponibilidadeFinanceira: feed.disponibilidadeFinanceira,
    diagnosticoGeografico: feed.diagnosticoGeografico,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(feed, null, 2) + "\n");
  writeFileSync(STATUS, JSON.stringify(status, null, 2) + "\n");
  console.log(JSON.stringify(status));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await collectStateTrends();
}

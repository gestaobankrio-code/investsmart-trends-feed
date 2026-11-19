import assert from "node:assert/strict";
import { parseStateRSS, UFS } from "./state-trends.mjs";
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0"><channel><title>Trending Now</title>',
  '<item><title>Anthropic IPO</title><link>https://trends.google.com/trending?geo=BR-MG</link><pubDate>Thu, 19 Nov 2026 20:00:00 GMT</pubDate></item>',
  '<item><title>dólar hoje</title><pubDate>Thu, 19 Nov 2026 19:00:00 GMT</pubDate></item>',
  '<item><title>futebol x basquete</title></item>',
  '<item><title>dólar hoje</title></item>',
  '</channel></rss>',
].join("");
const mg = parseStateRSS(xml, "MG");
assert.equal(UFS.length, 27);
assert.equal(mg.totalRSS, 4);
assert.deepEqual(mg.registros.map((r) => r.termo), ["Anthropic IPO", "dólar hoje"]);
assert.ok(mg.registros.every((r) => r.uf === "MG" && r.geoConsultado === "BR-MG"));
assert.equal(mg.registros[0].dataFonte, "2026-11-19T20:00:00.000Z");
assert.equal(mg.registros[1].urlFonte, "https://trends.google.com/trending/rss?geo=BR-MG");
assert.equal(parseStateRSS(xml, "BA").registros[0].uf, "BA");
assert.throws(() => parseStateRSS(xml, "XX"), /UF não autorizada/);
assert.throws(() => parseStateRSS("<html>error</html>", "MG"), /RSS válido/);
console.log("RSS estadual: 27 UFs, filtragem financeira, geo, deduplicação e procedência verificados.");

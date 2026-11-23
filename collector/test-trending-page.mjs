import assert from "node:assert/strict";
import { parseTrendingPage, trendingPageURL } from "./trending-page.mjs";

const row = (title, categories, timestamp) => [
  title, null, null, [timestamp], null, null, 2000, null, 250, [], categories, [], null,
];
const rows = [
  row("dólar hoje", [3], 1795425000),
  row("ibovespa", [3], 1795424400),
  row("jogo de futebol", [17], 1795423800),
  row("boeing c-17", [3], 1795423200),
  row("dólar hoje", [3], 1795425600),
];
const page = "<html><script>AF_initDataCallback({key: 'ds:0', hash: '777', data:" +
  JSON.stringify([null, rows]) + ", sideChannel: {}});</script></html>";
const found = parseTrendingPage(page, "SP");
assert.equal(found.totalPagina, 5);
assert.equal(found.termosCategoriaGoogle, 4);
assert.equal(found.registros.length, 2);
assert.deepEqual(found.registros.map((r) => r.termo), ["dólar hoje", "ibovespa"]);
assert.ok(found.registros.every((r) =>
  r.uf === "SP" && r.geoConsultado === "BR-SP" &&
  r.categoriaGoogleId === 3 && r.janelaHoras === 168));
assert.equal(found.registros[0].dataFonte, new Date(1795425600 * 1000).toISOString());
assert.match(found.assinaturaPagina, /^[a-f0-9]{16}$/);
assert.equal(trendingPageURL("SP").searchParams.get("hours"), "168");
assert.throws(() => parseTrendingPage("<html>sem dados</html>", "SP"), /Página de tendências ausente|formato/);
console.log("Página estadual Google: classificação financeira, deduplicação, janela 168h e origem aprovadas.");

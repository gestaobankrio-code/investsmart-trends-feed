import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const collector = readFileSync(new URL("./collect.mjs", import.meta.url), "utf8");

// Proteção contra regressões: a seleção dos termos é sempre realizada
// pela fonte; não deve existir filtro lexical, lista curada ou amostragem por termo.
assert.match(collector, /SELECT MAX\(refresh_date\)/);
assert.match(collector, /WHERE country_code = 'BR'/);
assert.match(collector, /termos_reais_com_classificacao_financeira/);
for (const forbidden of [
  /REGEXP_CONTAINS\(term/i,
  /terms\.json/,
  /MAX_TERMS_PER_SOURCE/,
  /LOWER\(TRIM\(term\)\) IN \(/,
  /IN UNNEST\(/,
]) assert.doesNotMatch(collector, forbidden, `Filtro pré-definido encontrado: ${forbidden}`);

console.log("Seleção sem palavras-chave predefinidas: OK.");

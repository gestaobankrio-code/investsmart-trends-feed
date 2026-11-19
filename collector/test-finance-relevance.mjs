import assert from "node:assert/strict";
import { isFinancialSearch } from "./finance-relevance.mjs";

// Exemplos exclusivos de teste; os termos publicados sempre vêm do BigQuery.
for (const term of [
  "Bitcoin hoje", "Selic", "débito", "financiamento imobiliário",
  "CDB", "bolsa de valores", "Ibovespa hoje", "ações", "mercado financeiro",
]) {
  assert.equal(isFinancialSearch(term), true, `financeiro não reconhecido: ${term}`);
}
for (const term of [
  "classificações de flamengo x grêmio", "liga das nações", "seleção brasileira",
  "lakers x hornets", "GTA 6", "Hugo Motta", "sociedade anônima do futebol",
  "bolsa família", "previsão do tempo", "classificações de são paulo",
]) {
  assert.equal(isFinancialSearch(term), false, `assunto indevido: ${term}`);
}
console.log("Critérios temáticos validados sem predefinir resultados.");

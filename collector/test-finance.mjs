import assert from "node:assert/strict";
import { isFinancialTerm } from "./finance-topic.mjs";

// Fixtures são somente expectativas do teste, nunca registros publicados.
const finance = [
  "bitcoin hoje",
  "bolsa de valores",
  "selic",
  "ibovespa hoje",
  "dólar hoje",
  "investimentos 2027",
  "ações para investir",
  "tesouro direto",
  "fundos imobiliários",
];
const other = [
  "classificações de flamengo x grêmio",
  "liga das nações",
  "classificações de são paulo futebol clube",
  "futebol ao vivo",
  "previsão do tempo",
  "resultados da loteria",
];
for (const term of finance) assert.equal(isFinancialTerm(term), true, term);
for (const term of other) assert.equal(isFinancialTerm(term), false, term);
console.log("Taxonomia financeira validada: termos financeiros aceitos; futebol e outros temas rejeitados.");

import { classifyTerms } from "./classify-finance.mjs";
const examples = [
  "débito", "bitcoin", "ibovespa", "Selic", "CDB", "crédito consignado",
  "mercado de ações", "bolsa de valores", "fundos imobiliários",
  "sociedade anônima do futebol", "lakers x hornets", "gta 6",
  "fernando alonso", "hugo motta", "política", "can yaman",
  "santos x são paulo", "github", "apagao",
];
console.log(JSON.stringify(await classifyTerms(examples), null, 2));

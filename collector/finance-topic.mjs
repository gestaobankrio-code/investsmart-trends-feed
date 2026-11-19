/**
 * Classificação temática, não lista de palavras-chave retornadas.
 * Os termos encontrados e todos os indicadores são obtidos do BigQuery.
 * Padrão compatível com RE2 (BigQuery) e RegExp (Node.js).
 */
export const FINANCE_PATTERN = String.raw`(bitcoin|ethereum|criptomoed|criptoativ|ibovespa|bovespa|\bselic\b|\bipca\b|\bcdi\b|\bcdb\b|\blci\b|\blca\b|\bfii\b|fiagro|tesouro direto|tesouro selic|fundos? imobili[aá]ri|renda fixa|bolsa de valores|d[oó]lar|c[aâ]mbio|investiment|mercado financeiro|dividend|taxa de juros|juros compostos|(?:^|\s)a[cç][oõ]es(?:$|\s)|renda vari[aá]vel|previd[eê]ncia privada|banco central|fundos? de investiment)`;

const financeMatcher = new RegExp(FINANCE_PATTERN, "i");
export const isFinancialTerm = (value) =>
  typeof value === "string" && financeMatcher.test(value.trim());

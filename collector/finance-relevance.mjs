// A fonte fornece os termos; esta regra apenas verifica relevância financeira.
// Não é uma lista de buscas ou de resultados a publicar. Casos ambíguos são excluídos.
const CONCEPTS = [
  /\b(bitcoin|ethereum|criptomoed\w*|criptoativ\w*|blockchain|ibovespa|bovespa)\b/,
  /\b(ipo|oferta publica de acoes|itau|bradesco|nubank|btg pactual|banco do brasil)\b/,
  /\b(selic|ipca|igpm|cdi|cdb|lci|lca|fii|fiagro|cri|cra|etf|bdr)\b/,
  /\b(dolar|cambio|forex|bacen|copom|tesouro|dividendo\w*|rentabilidade)\b/,
  /\b(investiment\w*|investir|investidor\w*|financiamen\w*|fintech\w*|credito|debito|emprestimo\w*)\b/,
  /\b(bolsa de valores|mercado financeiro|mercado de capitais|renda fixa|renda variavel|acoes|titulo\w* public\w*|fundos? imobiliari\w*|taxa de juros|juros compostos)\b/,
  /\b(previdencia privada|previdencia complementar|corretora\w*|taxa de cambio|carta de credito)\b/,
];

const CONTEXT_EXCLUSIONS = [
  /\b(classificacoes?|campeonato\w*|futebol|partida\w*|liga das nacoes|selecao|placar|jogo do|nba|basket|lakers|x real madrid)\b/,
  /\b(bolsa familia|bolsa de estudo\w*)\b/,
];

export const normalizeTopic = (term) =>
  String(term ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function isFinancialSearch(term) {
  const value = normalizeTopic(term);
  if (!value || value.length > 150 || CONTEXT_EXCLUSIONS.some((re) => re.test(value))) return false;
  return CONCEPTS.some((re) => re.test(value));
}

/**
 * Classificador semântico de ASSUNTOS; não seleciona termos de uma lista.
 * Apenas classifica textos obtidos pelo BigQuery. Sem APIs pagas ou credenciais.
 * A saída é um palpite do modelo, não uma categoria oficial do Google Trends.
 */
export const MODEL_ID = "onnx-community/multilingual-MiniLMv2-L6-mnli-xnli-ONNX";
export const CATEGORIES = [
  "mercado financeiro, investimentos, crédito, bancos e economia",
  "esportes, campeonatos e partidas",
  "entretenimento, celebridades, cinema e jogos",
  "política, eleições e governo",
  "tecnologia, programação e aplicativos",
  "saúde, medicina e doenças",
  "outros assuntos sem relação financeira",
];
export const FINANCE_LABEL = CATEGORIES[0];

export async function classifyTerms(terms, options = {}) {
  if (!Array.isArray(terms) || terms.some((term) => typeof term !== "string")) {
    throw new Error("Classificação exige termos de busca reais.");
  }
  const { pipeline } = await import("@huggingface/transformers");
  const classifier = await pipeline("zero-shot-classification", MODEL_ID, {
    dtype: "q8", device: "cpu",
  });
  const report = [];
  for (const term of [...new Set(terms)]) {
    const result = await classifier(
      `Assunto pesquisado no Google: ${term}.`,
      CATEGORIES,
      { hypothesis_template: "Esta pesquisa se refere a {}." },
    );
    const scores = result.scores ?? [];
    const labels = result.labels ?? [];
    const best = String(labels[0] ?? "");
    const confidence = Number(scores[0] ?? 0);
    const margin = confidence - Number(scores[1] ?? 0);
    const financial = best === FINANCE_LABEL && confidence >= (options.threshold ?? 0.60) && margin >= 0.12;
    report.push({ term, financial, category: best, confidence: Number(confidence.toFixed(3)), margin: Number(margin.toFixed(3)), model: MODEL_ID });
  }
  if (classifier.dispose) await classifier.dispose();
  return report;
}

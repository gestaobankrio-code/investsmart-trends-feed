# Fonte de tendências financeiras estaduais — InvestSmart Intelligence

## Problema corrigido em 23/11/2026

O RSS `/trending/rss?geo=BR-UF` devolve aproximadamente os dez assuntos mais recentes,
sem filtro temático efetivo. Em 23/11/2026 as 27 UFs responderam, mas todos
os resultados ficaram fora do recorte financeiro: o dashboard mostrava zero.

## Nova origem

O coletor acessa a **página pública** do Google Trends Trending Now:
`https://trends.google.com/trending?geo=BR-SP&hl=pt-BR&hours=168`.
O termo, o início do interesse, a categoria e os demais valores vêm do JSON
embutido na resposta da própria página, específico da UF consultada.

A consulta usa 168 horas e exige:
- categoria **Business and Finance** do Google Trends (ID 3);
- pertinência ao domínio financeiro segundo a regra auditável
  `collector/finance-relevance.mjs`;
- nome de UF e código `BR-UF` coerentes, procedência e data;
- validação de 27 assinaturas geográficas e ausência de listas replicadas em massa.

**Não existe lista de palavras de resultado para cada estado.** Uma mesma
palavra pode ser uma tendência legítima em duas ou mais UFs. As consultas são
independentes, com registros geográficos próprios.

## Resultado da primeira coleta ampliada

Em 23/11/2026, 12:50 UTC: 27 UFs consultadas; 24 com termos financeiros;
69 ocorrências de termos, em sete dias. AC, AP e RR não apresentaram itens
financeiros classificados na janela, sem que isso signifique demanda zero.

O feed resultante:
- `docs/data/state-trends.json`
- `docs/data/state-status.json`

## Limitações e governança

Esta extração utiliza a **estrutura HTML pública** do Trending Now.
Ela **não é a API oficial** do Google Trends. Se o Google alterar a estrutura,
o coletor deve falhar e preservar dados anteriores, sem inventar termos.
A categoria 3 inclui negócios e finanças; a segunda validação busca restringir
o resultado a assuntos financeiros. Pode haver falsos negativos e casos
ambíguos. Não alegar cobertura absoluta ou precisão sem ressalvas.

O volume mínimo estimado da página não representa volume exato de buscas.
O RSS pode ser usado para diagnóstico, não para alimentar o radar sem
explicitar que é uma amostra limitada. A lista nacional do BigQuery permanece
separada das tendências realmente detectadas na consulta de cada UF.

## Testes

`node collector/test-trending-page.mjs`
`node collector/state-trends.mjs`
`node collector/validate-state.mjs`

A coleta real roda no GitHub Actions em `.github/workflows/state-trends.yml`.

# InvestSmart Trends Feed

Feed público de dados reais utilizado pelo **InvestSmart Intelligence**.

## Fonte

Google Trends Public Dataset no BigQuery:

- `bigquery-public-data.google_trends.international_top_terms`
- `bigquery-public-data.google_trends.international_top_rising_terms`

O dataset internacional disponibiliza Top 25 e Top Rising por país e sub-região. O coletor seleciona o Brasil (`country_code = BR`) e lê **todos os termos encontrados no último refresh de cada tabela**, sem lista fixa, correspondência de palavras-chave, classificação temática ou limite artificial de termos. A fonte inclui assuntos não financeiros. Não representa todas as buscas feitas no Google.

## Arquivos públicos

- `docs/data/trends.json`
- `docs/data/status.json`

Publicados também pelo GitHub Pages.

## Integridade

A coleta:

- não usa scraping do Google Trends;
- não gera registros fictícios;
- preserva ausência de dado como ausência, não como índice zero;
- trata o índice como escala relativa 0–100;
- calcula variação como diferença em pontos entre as semanas mais recentes disponíveis;
- preserva termos de qualquer assunto retornados pelo dataset, rejeitando apenas registros regionais inválidos;
- se a fonte não retorna dados, não publica um resultado fictício nem declara falsa atualização;
- mantém alerta quando a data de origem é mais antiga que três dias.

## Automação

### Atualizar InvestSmart Trends

Executa diariamente às 15:15 UTC e também manualmente.

Autenticação recomendada: GitHub OIDC + Google Workload Identity Federation, sem chave JSON persistente.

Variáveis exigidas no repositório:

- `GCP_PROJECT_ID`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`

### Monitorar freshness do feed

Executa diariamente às 17:00 UTC.

O limite operacional é 3 dias. Quando ultrapassado, o workflow abre/atualiza uma issue com a label `feed-stale`. Quando a fonte volta ao normal, a issue é fechada automaticamente.

## Validação local

```bash
node --check collector/collect.mjs
node collector/validate.mjs
node collector/check-freshness.mjs --max-days=3
```

A execução real de `collector/collect.mjs` requer o comando `bq` autenticado e `GCP_PROJECT_ID` definido.

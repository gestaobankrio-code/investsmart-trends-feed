# InvestSmart Trends Feed

Feed público de dados reais utilizado pelo **InvestSmart Intelligence**.

## Fonte

Google Trends Public Dataset no BigQuery:

- `bigquery-public-data.google_trends.international_top_terms`
- `bigquery-public-data.google_trends.international_top_rising_terms`

O dataset internacional disponibiliza Top 25 e Top Rising por país e sub-região. O coletor descobre os termos de busca reais do Brasil (`country_code = BR`) nas atualizações das últimas cinco semanas, sem cadastrar palavras-chave de saída. Em seguida, aplica critérios de relevância do mercado financeiro (`collector/finance-relevance.mjs`); não fabrica termos, valores ou índices. Essa classificação temática é uma regra operacional, não uma categoria certificada pelo Google. O mesmo destaque nacional pode ter séries regionais em várias UFs, o que **não significa uma tendência exclusiva daquele estado**.

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
- apresenta apenas os termos reais cuja relevância financeira foi validada por critérios de domínio;
- não predefine quais palavras de busca aparecerão no dashboard;
- distingue termos nacionais de séries regionais, sem interpretar múltiplas UFs como assuntos independentes;
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

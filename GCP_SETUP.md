# Configurar BigQuery automático com GitHub OIDC

O feed usa o Google Trends Public Dataset no BigQuery. Para atualizar automaticamente sem armazenar chave JSON de service account, use Workload Identity Federation.

## Pré-requisito

Você precisa de um projeto Google Cloud em que tenha permissão para:

- habilitar APIs;
- criar service account;
- criar Workload Identity Pool/Provider;
- editar IAM.

O dataset do Google Trends é público. O projeto é usado para executar o job BigQuery.

## Método recomendado

Abra o **Google Cloud Shell** no projeto desejado e execute:

```bash
git clone https://github.com/gestaobankrio-code/investsmart-trends-feed.git
cd investsmart-trends-feed
bash collector/setup-gcp-wif.sh SEU_PROJECT_ID
```

O script:

1. habilita BigQuery, IAM Credentials e STS;
2. cria a service account `investsmart-trends-feed`;
3. concede apenas `roles/bigquery.jobUser` no projeto;
4. cria um Workload Identity Pool;
5. cria um provider OIDC limitado ao repository ID `1447386653`;
6. autoriza apenas `gestaobankrio-code/investsmart-trends-feed` a impersonar a service account;
7. imprime os três valores que devem ser cadastrados no GitHub.

## Repository Variables

No GitHub:

**Settings → Secrets and variables → Actions → Variables**

Cadastre:

- `GCP_PROJECT_ID`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`

Esses valores não são chaves privadas.

## Teste definitivo

Depois de cadastrar as variáveis:

**Actions → Atualizar InvestSmart Trends → Run workflow**

O teste só passa se:

- autenticação OIDC funcionar;
- consulta BigQuery retornar dados reais;
- `collector/validate.mjs` aprovar o feed;
- freshness ficar dentro do limite;
- `docs/data/trends.json` e `status.json` forem atualizados;
- a issue de feed desatualizado for fechada automaticamente após a publicação.

Não crie nem envie uma chave JSON para o repositório.

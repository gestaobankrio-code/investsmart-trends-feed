#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-${PROJECT_ID:-}}"
GITHUB_REPO="gestaobankrio-code/investsmart-trends-feed"
GITHUB_REPO_ID="1447386653"
POOL_ID="github-actions"
PROVIDER_ID="github-investsmart-trends"
SERVICE_ACCOUNT_ID="investsmart-trends-feed"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Uso: bash collector/setup-gcp-wif.sh SEU_PROJECT_ID"
  exit 1
fi

echo "Configurando projeto: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Habilitando APIs necessárias..."
gcloud services enable   bigquery.googleapis.com   iamcredentials.googleapis.com   sts.googleapis.com   --project="$PROJECT_ID"

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Criando service account..."
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_ID"     --display-name="InvestSmart Trends Feed"     --project="$PROJECT_ID"
fi

echo "Confirmando propagação da service account no IAM..."
visible="false"
for attempt in $(seq 1 12); do
  if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL"     --project="$PROJECT_ID"     --format="value(uniqueId)" >/tmp/investsmart-sa-id 2>/dev/null; then
    if [[ -s /tmp/investsmart-sa-id ]]; then
      visible="true"
      break
    fi
  fi
  sleep 5
done

if [[ "$visible" != "true" ]]; then
  echo "ERRO: a service account foi criada, mas ainda não está visível no IAM."
  echo "Execute novamente este mesmo script depois que o comando abaixo retornar um uniqueId:"
  echo "gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID --format='value(uniqueId)'"
  exit 1
fi

echo "Service account visível no IAM: $(cat /tmp/investsmart-sa-id)"
echo "Concedendo permissão mínima para executar jobs BigQuery..."
gcloud projects add-iam-policy-binding "$PROJECT_ID"   --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL"   --role="roles/bigquery.jobUser"   --condition=None >/dev/null

if ! gcloud iam workload-identity-pools describe "$POOL_ID"   --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Criando Workload Identity Pool..."
  gcloud iam workload-identity-pools create "$POOL_ID"     --location=global     --display-name="GitHub Actions"     --project="$PROJECT_ID"
fi

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID"   --workload-identity-pool="$POOL_ID"   --location=global   --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Criando provider OIDC restrito ao repositório do feed..."
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID"     --workload-identity-pool="$POOL_ID"     --location=global     --issuer-uri="https://token.actions.githubusercontent.com"     --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.repository_owner=assertion.repository_owner"     --attribute-condition="assertion.repository_id=='$GITHUB_REPO_ID'"     --display-name="InvestSmart Trends GitHub"     --project="$PROJECT_ID"
fi

echo "Autorizando somente $GITHUB_REPO a impersonar a service account..."
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL"   --project="$PROJECT_ID"   --role="roles/iam.workloadIdentityUser"   --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$GITHUB_REPO" >/dev/null

PROVIDER="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"

cat <<EOF

Configuração GCP concluída.

Cadastre estas 3 REPOSITORY VARIABLES no GitHub:
Settings > Secrets and variables > Actions > Variables

GCP_PROJECT_ID
$PROJECT_ID

GCP_WORKLOAD_IDENTITY_PROVIDER
$PROVIDER

GCP_SERVICE_ACCOUNT
$SERVICE_ACCOUNT_EMAIL

Depois execute o workflow "Atualizar InvestSmart Trends" em Actions > Run workflow.
EOF

#!/usr/bin/env bash
# Deploy Compound to Google Cloud (Cloud Run + Cloud SQL Postgres + Artifact Registry).
#
# One-time setup: edit PROJECT_ID + REGION below (or pass as env vars), then run.
# Idempotent — re-run after changes to push new revisions.
#
# Cost estimate (smallest viable footprint):
#   - Cloud SQL db-f1-micro PG: ~$8/mo
#   - Cloud Run (both services): free tier covers light personal use
#   - Artifact Registry: ~$0.10/GB/mo (negligible)
#
# Usage:
#   PROJECT_ID=my-project ./scripts/deploy-gcloud.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"
SQL_INSTANCE="${SQL_INSTANCE:-compound-db}"
SQL_TIER="${SQL_TIER:-db-f1-micro}"
SQL_DB="${SQL_DB:-compound}"
SQL_USER="${SQL_USER:-compound}"
REPO="${REPO:-compound}"
API_SERVICE="${API_SERVICE:-compound-api}"
WEB_SERVICE="${WEB_SERVICE:-compound-web}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "❌  Set PROJECT_ID (env var or 'gcloud config set project <id>')." >&2
  exit 1
fi

# Load Gemini key from backend/.env if not set
if [[ -z "${GEMINI_API_KEY:-}" && -f backend/.env ]]; then
  GEMINI_API_KEY="$(grep -E '^GEMINI_API_KEY=' backend/.env | cut -d= -f2- | tr -d '"' || true)"
fi

echo "──────────────────────────────────────────────────"
echo "  Project:    $PROJECT_ID"
echo "  Region:     $REGION"
echo "  SQL inst:   $SQL_INSTANCE ($SQL_TIER)"
echo "  Services:   $API_SERVICE, $WEB_SERVICE"
echo "──────────────────────────────────────────────────"
read -r -p "Proceed? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 0; }

# ──── 1. Enable APIs ────
echo "→ Enabling APIs (run, sql-admin, artifactregistry, secretmanager, cloudbuild)…"
gcloud --project "$PROJECT_ID" services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com

# ──── 2. Artifact Registry repo ────
echo "→ Ensuring Artifact Registry repo '$REPO'…"
gcloud --project "$PROJECT_ID" artifacts repositories describe "$REPO" \
  --location "$REGION" >/dev/null 2>&1 || \
gcloud --project "$PROJECT_ID" artifacts repositories create "$REPO" \
  --repository-format=docker --location="$REGION" \
  --description="Compound images"

# ──── 3. Cloud SQL Postgres ────
if ! gcloud --project "$PROJECT_ID" sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1; then
  echo "→ Creating Cloud SQL Postgres '$SQL_INSTANCE' (~3-5 min)…"
  DB_ROOT_PASS="$(openssl rand -base64 24 | tr -d '/=+' | head -c 28)"
  gcloud --project "$PROJECT_ID" sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_16 \
    --tier="$SQL_TIER" \
    --region="$REGION" \
    --storage-auto-increase \
    --root-password="$DB_ROOT_PASS"
  echo "    (root password generated — re-set the user password below)"
fi

# Database
if ! gcloud --project "$PROJECT_ID" sql databases describe "$SQL_DB" --instance "$SQL_INSTANCE" >/dev/null 2>&1; then
  echo "→ Creating database '$SQL_DB'…"
  gcloud --project "$PROJECT_ID" sql databases create "$SQL_DB" --instance "$SQL_INSTANCE"
fi

# User
if ! gcloud --project "$PROJECT_ID" sql users list --instance "$SQL_INSTANCE" --format='value(name)' | grep -qx "$SQL_USER"; then
  echo "→ Creating SQL user '$SQL_USER'…"
  SQL_USER_PASS="$(openssl rand -base64 24 | tr -d '/=+' | head -c 28)"
  gcloud --project "$PROJECT_ID" sql users create "$SQL_USER" \
    --instance="$SQL_INSTANCE" --password="$SQL_USER_PASS"
else
  echo "→ Re-setting password for existing SQL user '$SQL_USER'…"
  SQL_USER_PASS="$(openssl rand -base64 24 | tr -d '/=+' | head -c 28)"
  gcloud --project "$PROJECT_ID" sql users set-password "$SQL_USER" \
    --instance="$SQL_INSTANCE" --password="$SQL_USER_PASS"
fi

SQL_CONN_NAME="$(gcloud --project "$PROJECT_ID" sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"

# Cloud Run uses unix sockets to talk to Cloud SQL.
DB_URL="postgresql://${SQL_USER}:${SQL_USER_PASS}@/${SQL_DB}?host=/cloudsql/${SQL_CONN_NAME}"

# ──── 4. Secrets ────
echo "→ Storing secrets in Secret Manager…"
upsert_secret() {
  local name="$1" value="$2"
  if gcloud --project "$PROJECT_ID" secrets describe "$name" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud --project "$PROJECT_ID" secrets versions add "$name" --data-file=- >/dev/null
  else
    printf '%s' "$value" | gcloud --project "$PROJECT_ID" secrets create "$name" --data-file=- --replication-policy=automatic >/dev/null
  fi
}

upsert_secret "compound-database-url" "$DB_URL"
if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  upsert_secret "compound-gemini-api-key" "$GEMINI_API_KEY"
fi

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud --project "$PROJECT_ID" secrets add-iam-policy-binding compound-database-url \
  --member="serviceAccount:${RUN_SA}" --role=roles/secretmanager.secretAccessor --quiet >/dev/null
[[ -n "${GEMINI_API_KEY:-}" ]] && gcloud --project "$PROJECT_ID" secrets add-iam-policy-binding compound-gemini-api-key \
  --member="serviceAccount:${RUN_SA}" --role=roles/secretmanager.secretAccessor --quiet >/dev/null

# ──── 5. Build + push images ────
IMAGE_API="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/api:latest"
IMAGE_WEB="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/web:latest"

echo "→ Building & pushing API image via Cloud Build (repo root as context)…"
# Backend Dockerfile expects repo root so it can COPY both backend/ and docs/.
cat > /tmp/cloudbuild-api.yaml <<YAML
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-f', 'backend/Dockerfile', '-t', '${IMAGE_API}', '.']
  - name: gcr.io/cloud-builders/docker
    args: ['push', '${IMAGE_API}']
images: ['${IMAGE_API}']
options:
  logging: CLOUD_LOGGING_ONLY
YAML
gcloud --project "$PROJECT_ID" builds submit --config=/tmp/cloudbuild-api.yaml .

echo "→ Building & pushing WEB image…"
gcloud --project "$PROJECT_ID" builds submit frontend --tag "$IMAGE_WEB"

# ──── 6. Deploy API to Cloud Run (1st pass, no CORS_ORIGINS yet) ────
echo "→ Deploying API to Cloud Run…"
API_ENV="LOG_LEVEL=INFO,AI_PROVIDER=gemini,AI_MODEL=gemini-3.1-flash-lite"
API_SECRETS="DATABASE_URL=compound-database-url:latest"
[[ -n "${GEMINI_API_KEY:-}" ]] && API_SECRETS+=",GEMINI_API_KEY=compound-gemini-api-key:latest"

gcloud --project "$PROJECT_ID" run deploy "$API_SERVICE" \
  --image "$IMAGE_API" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances "$SQL_CONN_NAME" \
  --set-env-vars "$API_ENV" \
  --set-secrets "$API_SECRETS" \
  --memory 512Mi --cpu 1 \
  --min-instances 0 --max-instances 4 \
  --timeout 300

API_URL="$(gcloud --project "$PROJECT_ID" run services describe "$API_SERVICE" --region "$REGION" --format='value(status.url)')"
echo "    API: $API_URL"

# ──── 7. Deploy WEB to Cloud Run ────
echo "→ Deploying WEB to Cloud Run…"
gcloud --project "$PROJECT_ID" run deploy "$WEB_SERVICE" \
  --image "$IMAGE_WEB" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_URL=${API_URL}/api" \
  --memory 512Mi --cpu 1 \
  --min-instances 0 --max-instances 4 \
  --timeout 60

WEB_URL="$(gcloud --project "$PROJECT_ID" run services describe "$WEB_SERVICE" --region "$REGION" --format='value(status.url)')"

# ──── 8. Update API CORS to allow WEB origin ────
echo "→ Updating API CORS to allow $WEB_URL…"
gcloud --project "$PROJECT_ID" run services update "$API_SERVICE" \
  --region "$REGION" \
  --update-env-vars "CORS_ORIGINS=${WEB_URL}"

echo ""
echo "──────────────────────────────────────────────────"
echo "  ✅  Deployed."
echo "  API: $API_URL"
echo "  WEB: $WEB_URL"
echo "──────────────────────────────────────────────────"
echo ""
echo "Next:"
echo "  1) Import curriculum:  curl -X POST '${API_URL}/api/curriculum/import/default?prune=true'"
echo "  2) Reschedule:         curl -X POST ${API_URL}/api/curriculum/reschedule -H 'Content-Type: application/json' -d '{\"start_date\":\"2026-05-26\"}'"
echo "  3) Open the app:       open $WEB_URL"

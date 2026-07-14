#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-0bdd0a8e-1e7e-4477-99a}"
REGION="${REGION:-asia-south1}"
BACKEND_SERVICE="${BACKEND_SERVICE:-india-report-backend}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-india-report-frontend}"
INGESTION_JOB="${INGESTION_JOB:-india-report-ingestion-job}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BACKEND_ENV_ARGS=()

if [[ -n "${BACKEND_ENV_FILE}" ]]; then
  BACKEND_ENV_ARGS=(--env-vars-file "${BACKEND_ENV_FILE}")
fi

echo "Deploying Social service: india-report-social"
gcloud builds submit "${ROOT_DIR}" \
  --project "${PROJECT_ID}" \
  --config "${ROOT_DIR}/cloudbuild.social.yaml" \
  --substitutions SHORT_SHA=latest

SOCIAL_URL="$(gcloud run services describe "india-report-social" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format 'value(status.url)')"

echo "Social service URL: ${SOCIAL_URL}"

echo "Deploying RAG service: india-report-rag"
gcloud builds submit "${ROOT_DIR}" \
  --project "${PROJECT_ID}" \
  --config "${ROOT_DIR}/cloudbuild.rag.yaml" \
  --substitutions SHORT_SHA=latest

RAG_URL="$(gcloud run services describe "india-report-rag" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format 'value(status.url)')"

echo "RAG service URL: ${RAG_URL}"

# Merge dynamic environment variables for backend deployment
BACKEND_DYNAMIC_ENV="SOCIAL_SERVICE_URL=${SOCIAL_URL},RAG_SERVICE_URL=${RAG_URL}"

echo "Deploying backend service: ${BACKEND_SERVICE}"
if [[ ${#BACKEND_ENV_ARGS[@]} -gt 0 ]]; then
  gcloud run deploy "${BACKEND_SERVICE}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --source "${ROOT_DIR}/backend" \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars "${BACKEND_DYNAMIC_ENV}" \
    "${BACKEND_ENV_ARGS[@]}"
else
  # Update existing service env variables if source deploy is skipped
  gcloud run services update "${BACKEND_SERVICE}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --update-env-vars "${BACKEND_DYNAMIC_ENV}"
fi

echo "Deploying ingestion job: ${INGESTION_JOB}"
if [[ ${#BACKEND_ENV_ARGS[@]} -gt 0 ]]; then
  gcloud run jobs deploy "${INGESTION_JOB}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --source "${ROOT_DIR}/backend" \
    --command "node" \
    --args "dist/cron/runIngestion.js" \
    --task-timeout "45m" \
    --set-env-vars "SOCIAL_SERVICE_URL=${SOCIAL_URL}" \
    "${BACKEND_ENV_ARGS[@]}"
else
  gcloud run jobs update "${INGESTION_JOB}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --update-env-vars "SOCIAL_SERVICE_URL=${SOCIAL_URL}"
fi

BACKEND_URL="$(gcloud run services describe "${BACKEND_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format 'value(status.url)')"

echo "Backend URL: ${BACKEND_URL}"
echo "Deploying frontend service: ${FRONTEND_SERVICE}"
gcloud run deploy "${FRONTEND_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source "${ROOT_DIR}/frontend" \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "BACKEND_URL=${BACKEND_URL},RAG_API_URL=${RAG_URL}"

FRONTEND_URL="$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format 'value(status.url)')"

echo "Frontend URL: ${FRONTEND_URL}"



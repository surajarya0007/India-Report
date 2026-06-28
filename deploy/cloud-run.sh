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

echo "Deploying backend service: ${BACKEND_SERVICE}"
if [[ ${#BACKEND_ENV_ARGS[@]} -gt 0 ]]; then
  gcloud run deploy "${BACKEND_SERVICE}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --source "${ROOT_DIR}/backend" \
    --allow-unauthenticated \
    --port 8080 \
    "${BACKEND_ENV_ARGS[@]}"
else
  gcloud run deploy "${BACKEND_SERVICE}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --source "${ROOT_DIR}/backend" \
    --allow-unauthenticated \
    --port 8080
fi

echo "Deploying ingestion job: ${INGESTION_JOB}"
if [[ ${#BACKEND_ENV_ARGS[@]} -gt 0 ]]; then
  gcloud run jobs deploy "${INGESTION_JOB}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --source "${ROOT_DIR}/backend" \
    --command "node" \
    --args "dist/cron/runIngestion.js" \
    "${BACKEND_ENV_ARGS[@]}"
else
  gcloud run jobs deploy "${INGESTION_JOB}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --source "${ROOT_DIR}/backend" \
    --command "node" \
    --args "dist/cron/runIngestion.js"
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
  --set-env-vars "BACKEND_URL=${BACKEND_URL}"

FRONTEND_URL="$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format 'value(status.url)')"

echo "Frontend URL: ${FRONTEND_URL}"

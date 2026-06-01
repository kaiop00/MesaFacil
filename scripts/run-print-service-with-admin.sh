#!/usr/bin/env bash
set -euo pipefail

# Script de exemplo para iniciar o print-service com credenciais e worker habilitado
# Uso: ./scripts/run-print-service-with-admin.sh /path/to/service-account.json

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 /path/to/service-account.json"
  exit 2
fi

SA_PATH="$1"

export FIREBASE_SERVICE_ACCOUNT_PATH="$SA_PATH"
export ENABLE_QUEUE_WORKER=true
export PORT=${PORT:-4891}

echo "Starting MesaFacil Print Service with worker..."
node apps/print-service/server.js

#!/usr/bin/env bash
set -euo pipefail

# Script de exemplo para iniciar o print-service com credenciais e worker habilitado
# Uso preferencial:
#   ./scripts/run-print-service-with-admin.sh
# Ou com caminho explícito:
#   ./scripts/run-print-service-with-admin.sh /path/to/service-account.json

DEFAULT_SA_PATH="$HOME/.config/mesafacil/service-account.json"
SA_PATH="${1:-$DEFAULT_SA_PATH}"

if [ ! -f "$SA_PATH" ]; then
  echo "Credencial não encontrada em: $SA_PATH"
  echo "Coloque o JSON da service account nesse caminho ou informe um caminho explícito."
  exit 2
fi

export FIREBASE_SERVICE_ACCOUNT_PATH="$SA_PATH"
export GOOGLE_APPLICATION_CREDENTIALS="$SA_PATH"
export ENABLE_QUEUE_WORKER=true
export PORT=${PORT:-4891}
export ALLOW_FIREBASE_ADC=${ALLOW_FIREBASE_ADC:-false}

echo "Starting MesaFacil Print Service with worker..."
echo "Service account: $SA_PATH"
node apps/print-service/server.js

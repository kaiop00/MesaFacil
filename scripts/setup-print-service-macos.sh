#!/usr/bin/env bash
set -euo pipefail

if [[ "${OSTYPE:-}" != darwin* ]]; then
  echo "Este instalador é destinado ao macOS."
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_CONFIG_DIR="$HOME/.config/mesafacil"
DEFAULT_SA_PATH="$DEFAULT_CONFIG_DIR/service-account.json"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/br.com.mesafacil.print-service.plist"
LOG_DIR="$HOME/Library/Logs/MesaFacil"
STDOUT_LOG="$LOG_DIR/print-service.out.log"
STDERR_LOG="$LOG_DIR/print-service.err.log"
PORT_VALUE="${PORT:-4891}"
HOST_VALUE="${HOST:-127.0.0.1}"
QUEUE_WORKER_VALUE="${ENABLE_QUEUE_WORKER:-true}"
ADC_VALUE="${ALLOW_FIREBASE_ADC:-false}"

SOURCE_SA_PATH="${1:-}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado no PATH. Instale o Node antes de continuar."
  exit 2
fi

NODE_BIN="$(command -v node)"

mkdir -p "$DEFAULT_CONFIG_DIR" "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

if [[ -n "$SOURCE_SA_PATH" ]]; then
  if [[ ! -f "$SOURCE_SA_PATH" ]]; then
    echo "Arquivo de credencial não encontrado: $SOURCE_SA_PATH"
    exit 2
  fi

  cp "$SOURCE_SA_PATH" "$DEFAULT_SA_PATH"
  chmod 600 "$DEFAULT_SA_PATH"
  echo "Credencial copiada para $DEFAULT_SA_PATH"
fi

if [[ ! -f "$DEFAULT_SA_PATH" ]]; then
  echo "Credencial não encontrada em $DEFAULT_SA_PATH"
  echo "Uso: ./scripts/setup-print-service-macos.sh /caminho/para/service-account.json"
  exit 2
fi

echo "Instalando dependências do print-service..."
npm --prefix "$ROOT_DIR/apps/print-service" install

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>br.com.mesafacil.print-service</string>

    <key>ProgramArguments</key>
    <array>
      <string>$NODE_BIN</string>
      <string>$ROOT_DIR/apps/print-service/server.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$ROOT_DIR/apps/print-service</string>

    <key>EnvironmentVariables</key>
    <dict>
      <key>PORT</key>
      <string>$PORT_VALUE</string>
      <key>HOST</key>
      <string>$HOST_VALUE</string>
      <key>ENABLE_QUEUE_WORKER</key>
      <string>$QUEUE_WORKER_VALUE</string>
      <key>ALLOW_FIREBASE_ADC</key>
      <string>$ADC_VALUE</string>
      <key>FIREBASE_SERVICE_ACCOUNT_PATH</key>
      <string>$DEFAULT_SA_PATH</string>
      <key>GOOGLE_APPLICATION_CREDENTIALS</key>
      <string>$DEFAULT_SA_PATH</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>$STDOUT_LOG</string>
    <key>StandardErrorPath</key>
    <string>$STDERR_LOG</string>
  </dict>
</plist>
PLIST

launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl load "$PLIST_PATH"

echo "LaunchAgent instalado em: $PLIST_PATH"
echo "Credencial padrão: $DEFAULT_SA_PATH"
echo "Logs:"
echo "  stdout: $STDOUT_LOG"
echo "  stderr: $STDERR_LOG"
echo "Teste sugerido:"
echo "  curl http://127.0.0.1:$PORT_VALUE/config-status"
# Deploy do Print Service (worker de fila)

Este documento explica como rodar o `print-service` com o worker que processa `printQueue` no Firestore.

Resumo: para que pedidos feitos via cliente (QR) sejam impressos automaticamente, o worker do `print-service` precisa estar rodando com credenciais do Firebase Admin e `ENABLE_QUEUE_WORKER=true`.

Opções de credenciais:
- `FIREBASE_SERVICE_ACCOUNT_JSON`: valor base64 ou JSON da service account. Se definido, o `print-service` tentará parsear e usar.
- `FIREBASE_SERVICE_ACCOUNT_PATH`: caminho para o arquivo JSON da service account no filesystem (alternativa a `FIREBASE_SERVICE_ACCOUNT_JSON`).
- `GOOGLE_APPLICATION_CREDENTIALS`: alias suportado (padrão do SDK).

Variáveis importantes:
- `ENABLE_QUEUE_WORKER=true` (habilita worker que enfileira e processa `printQueue`)
- `QUEUE_POLL_INTERVAL_MS` (padrão 5000)
- `QUEUE_BATCH_SIZE` (padrão 5)
- `PORT` (padrão 4891)
- `HOST` (padrão 127.0.0.1)

Execução local (exemplo usando arquivo de credenciais):

```bash
# exporte caminho para a credencial (memória segura/operação local)
export FIREBASE_SERVICE_ACCOUNT_PATH="$HOME/.config/mesafacil/service-account.json"
export ENABLE_QUEUE_WORKER=true
export PORT=4891

# inicializa o print-service (no diretório raiz do repo)
node apps/print-service/server.js
```

Execução local (exemplo usando JSON base64):

```bash
export FIREBASE_SERVICE_ACCOUNT_JSON=$(base64 -w 0 /path/to/service-account.json)
export ENABLE_QUEUE_WORKER=true
node apps/print-service/server.js
```

Docker (exemplo simples):

```yaml
# docker-compose.yml snippet
services:
  print-service:
    image: node:18
    working_dir: /app
    volumes:
      - ./:/app
      - /path/to/service-account.json:/run/secrets/mesafacil-sa.json:ro
    environment:
      - ENABLE_QUEUE_WORKER=true
      - FIREBASE_SERVICE_ACCOUNT_PATH=/run/secrets/mesafacil-sa.json
      - PORT=4891
    command: ["node", "apps/print-service/server.js"]
    ports:
      - "4891:4891"
```

Systemd unit (exemplo):

```
[Unit]
Description=MesaFacil Print Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/srv/mesafacil
Environment=ENABLE_QUEUE_WORKER=true
Environment=FIREBASE_SERVICE_ACCOUNT_PATH=/srv/mesafacil/creds/service-account.json
ExecStart=/usr/bin/node /srv/mesafacil/apps/print-service/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Notas de segurança:
- Nunca comite a service account no repositório.
- Use `secrets` do Docker, variáveis de ambiente seguras ou o provedor de secrets da sua infra.

Verificação após start:
- `GET /health` deve retornar JSON `ok: true`.
- `GET /printers` lista impressoras locais conectadas.
- O worker escreve logs indicando que enfileirou/printou jobs.

Observação:
- Este setup assume que o servidor onde o `print-service` roda tenha acesso às impressoras (cabeamento ou rede) e permissões.
- Se preferir, posso criar um sistema de deploy (Dockerfile + GitHub Actions) para facilitar a publicação. Diga se quer que eu gere esses artefatos.

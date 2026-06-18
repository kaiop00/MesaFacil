# Deploy do Print Service (worker de fila)

Este documento explica como rodar o `print-service` com o worker que processa `printQueue` no Firestore.

Resumo: para que pedidos feitos via cliente (QR) sejam impressos automaticamente, o worker do `print-service` precisa estar rodando com credenciais do Firebase Admin e `ENABLE_QUEUE_WORKER=true`.

Padrão universal recomendado para todas as máquinas:

- instalar o `print-service` localmente;
- salvar a mesma service account em um caminho padrão do sistema operacional;
- iniciar o serviço local na inicialização do computador;
- deixar o worker buscar e imprimir automaticamente os pedidos por setor.

Caminho padrão de credencial:

- macOS/Linux: `~/.config/mesafacil/service-account.json`
- Windows: `%APPDATA%/MesaFacil/service-account.json`

Instalação prudente recomendada no macOS:

```bash
npm run setup:print-service:macos -- /caminho/para/service-account.json
```

Esse instalador:

- copia a credencial para `~/.config/mesafacil/service-account.json`;
- instala as dependências de `apps/print-service`;
- registra um `LaunchAgent` do usuário;
- inicia o serviço automaticamente ao fazer login na máquina.

Instalação prudente recomendada no Windows:

```powershell
# Se o PowerShell disser que não consegue executar scripts, rode:
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force

# Depois execute o instalador:
npm run setup:print-service:windows -- -ServiceAccountPath "C:\path\to\service-account.json"
```

Esse instalador:

- copia a credencial para `%APPDATA%/MesaFacil/service-account.json`;
- instala as dependências de `apps/print-service`;
- registra uma tarefa no Task Scheduler;
- inicia o serviço automaticamente ao fazer login no Windows.
- os logs ficam em `%APPDATA%/MesaFacil/Logs`

Opções de credenciais:
- `FIREBASE_SERVICE_ACCOUNT_JSON`: valor base64 ou JSON da service account. Se definido, o `print-service` tentará parsear e usar.
- `FIREBASE_SERVICE_ACCOUNT_PATH`: caminho para o arquivo JSON da service account no filesystem (alternativa a `FIREBASE_SERVICE_ACCOUNT_JSON`).
- `GOOGLE_APPLICATION_CREDENTIALS`: alias suportado (padrão do SDK).
- Se nenhuma variável existir, o serviço procura automaticamente no caminho padrão acima.

Variáveis importantes:
- `ENABLE_QUEUE_WORKER=true` (habilita worker que enfileira e processa `printQueue`)
- `QUEUE_POLL_INTERVAL_MS` (padrão 5000)
- `QUEUE_BATCH_SIZE` (padrão 5)
- `PORT` (padrão 4891)
- `HOST` (padrão 127.0.0.1)

Execução local (exemplo usando arquivo de credenciais):

```bash
# caminho padrão universal por máquina
mkdir -p "$HOME/.config/mesafacil"
# copie a credencial para o caminho acima antes do start

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
- O fluxo automático depende do worker conseguir ler o Firestore e da impressora do setor estar configurada com `systemPrinter`.
- Cada pedido é separado por setor e impresso conforme novos documentos entram em `printQueue` ou em `mesas/{mesaId}/pedidos`.

Verificação operacional sugerida em cada máquina:

```bash
curl http://127.0.0.1:4891/health
curl http://127.0.0.1:4891/config-status
curl http://127.0.0.1:4891/printers
```

Critérios para considerar a máquina pronta:

- `queueWorker.firebaseReady = true`
- `queueWorker.active = true`
- pelo menos uma impressora listada
- a tela de `Impressora por setor` salva o nome correto em `systemPrinter`

No macOS, o `LaunchAgent` é gravado em:

- `~/Library/LaunchAgents/br.com.mesafacil.print-service.plist`

Os logs ficam em:

- `~/Library/Logs/MesaFacil/print-service.out.log`
- `~/Library/Logs/MesaFacil/print-service.err.log`

No Windows, a tarefa é registrada no Task Scheduler:

- Nome da tarefa: `\MesaFacil\MesaFacil Print Service`
- Inicia ao: login do usuário
- Variáveis de ambiente em: `%APPDATA%/MesaFacil/print-service.env`
- Script wrapper em: `%APPDATA%/MesaFacil/print-service-wrapper.ps1`
- Logs em: `%APPDATA%/MesaFacil/Logs/print-service.out.log` e `.err.log`

- Se preferir, posso criar um sistema de deploy (Dockerfile + GitHub Actions) para facilitar a publicação. Diga se quer que eu gere esses artefatos.

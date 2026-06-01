Print Agent (agente local de impressão)
=====================================

Este agente Node monitora a coleção `printQueue` (collection group) no Firestore,
processa jobs com `status: PENDENTE`, grava arquivos em `print-output/{idRestaurante}`
e atualiza o documento com `status: IMPRESSO` ou marca `ERRO` após tentativas.

Se você só quer listar as impressoras do S.O. no modal, o agente pode subir sem
credenciais Firebase. Nesse modo ele expõe apenas a API HTTP (`/printers`, `/health`) e
desativa a fila `printQueue`.

Pré-requisitos
--------------

- Ter uma service account JSON do Firebase (Project -> Service accounts).
- Definir a variável de ambiente `FIREBASE_SERVICE_ACCOUNT_PATH` apontando para o JSON
  (ou `GOOGLE_APPLICATION_CREDENTIALS`).
- Instalar dependências:

```bash
npm install firebase-admin dotenv
```

Como executar
-------------

```bash
# coloque a chave do service account localmente e exporte a variável
export FIREBASE_SERVICE_ACCOUNT_PATH="/caminho/para/serviceAccount.json"

# rodar o agente
npm run print-agent
```

Configuração
-------------

- `PRINT_AGENT_POLL_INTERVAL_MS` (padrão 5000) — intervalo de polling em ms.
- `PRINT_AGENT_MAX_ATTEMPTS` (padrão 3) — número máximo de tentativas antes de marcar `ERRO`.
- `PRINT_AGENT_HTTP_PORT` (padrão 3000) — porta onde o agente expõe a API HTTP opcional `/printers`.
- `PRINT_AGENT_PRINTERS` — (opcional) lista separada por vírgula de nomes de impressoras para fallback, ex: "Epson TM-T20, Zebra-1".
- `PRINT_AGENT_ENABLE_QUEUE_POLLING` — defina como `false` para subir apenas a API HTTP, sem consumir a fila do Firestore.

Para listar impressoras reais do S.O., o agente usa comandos nativos do macOS (`lpstat` e `system_profiler`).

Saída
-----

Arquivos simulando impressão serão criados em `print-output/{idRestaurante}/{jobId}.txt` e `.html`.

Notas
-----

- Este agente é um protótipo seguro para desenvolvimento local. Para impressão física, substitua
  a parte de escrita por integração com a impressora (socket TCP/ESC-POS, plugin nativo, ou API local).
- Em produção, considere usar Cloud Functions ou um agente robusto com controle de concorrência,
  travamento distribuído e métricas.

API HTTP adicional
------------------

O agente também expõe um endpoint POST `/print` para testes locais. Exemplo de payload:

```json
{
  "restauranteId": "myRestaurantId",
  "printerName": "Epson TM-T20",
  "ticketText": "Texto do cupom\nItem A - 1x\nTotal: R$ 10,00",
  "ticketHtml": "<html>...</html>",
  "jobId": "teste-123"
}
```

Resposta de sucesso:

```json
{ "ok": true, "id": "teste-123", "path": ".../print-output/myRestaurantId/teste-123" }
```

Use este endpoint para validar rapidamente a renderização de tickets sem depender do Firestore.

# Print Service (local)

Instruções para rodar o `print-service` localmente e fornecer credenciais do Firebase Admin.

Variáveis de ambiente suportadas:

- `FIREBASE_SERVICE_ACCOUNT_PATH`: caminho para o JSON da service account
- `GOOGLE_APPLICATION_CREDENTIALS`: caminho alternativo para o JSON (ADC compatível)
- `FIREBASE_SERVICE_ACCOUNT_JSON`: string JSON (ou base64) com o conteúdo da service account

Observação de segurança: não versionar o arquivo JSON em git e proteja-o com permissões restritas (`chmod 600`).

Exemplo (macOS / Linux):

```bash
export FIREBASE_SERVICE_ACCOUNT_PATH=/caminho/para/projectmesafacil-firebase-adminsdk-fbsvc-77c6c571d9.json
node apps/print-service/server.js
```

Se preferir usar ADC (gcloud):

```bash
gcloud auth application-default login
node apps/print-service/server.js
```

Observações:
- É preferível usar `FIREBASE_SERVICE_ACCOUNT_PATH` em CI e servidores. Ajuste permissões do arquivo (`chmod 600`).
- O serviço também tenta ler `.firebaserc` no root do repositório como fallback para `projectId`.

Troubleshooting:

- Se o worker não iniciar, verifique os logs para mensagens que contenham `Firebase Admin inicializado` ou `Credenciais do Firebase não encontradas`.
- Em ambientes de produção, prefira definir `FIREBASE_SERVICE_ACCOUNT_JSON` com conteúdo base64 via CI secrets.
 
Se quiser que eu rode os comandos aqui agora, confirme e eu paro qualquer instância existente e reinicio o serviço com as variáveis de ambiente apontando para o JSON que você compartilhou.
 
Como rodar localmente com o JSON que você forneceu:

```bash
export FIREBASE_SERVICE_ACCOUNT_PATH=/Users/kaioportela/Downloads/projectmesafacil-firebase-adminsdk-fbsvc-77c6c571d9.json
export GOOGLE_APPLICATION_CREDENTIALS=/Users/kaioportela/Downloads/projectmesafacil-firebase-adminsdk-fbsvc-77c6c571d9.json
node apps/print-service/server.js
```

Nota: se já houver uma instância em background, mate-a antes de rodar o comando acima com:

```bash
pkill -f 'apps/print-service/server.js' || true
```

Depois rode o `node apps/print-service/server.js` conforme o exemplo acima.
# MesaFacil Print Service

Serviço local responsável por detectar impressoras instaladas no sistema operacional e enviar comandos de impressão a partir do navegador/web app.

## Endpoints

- `GET http://localhost:4891/health`
- `GET http://localhost:4891/printers`
- `POST http://localhost:4891/test-print`
- `POST http://localhost:4891/print`

## Execução

```bash
cd apps/print-service
npm install
npm start
```

## Observações

- O serviço escuta apenas em `127.0.0.1` por padrão.
- A impressão usa `printer.printDirect` quando a biblioteca está disponível.
- Quando a biblioteca nativa não está disponível, o serviço tenta usar fallbacks do sistema operacional.
- Para habilitar o worker da fila do Firestore, configure uma destas opções:
	- `FIREBASE_SERVICE_ACCOUNT_JSON` com o JSON completo da service account;
	- `FIREBASE_SERVICE_ACCOUNT_PATH` ou `GOOGLE_APPLICATION_CREDENTIALS` apontando para o arquivo JSON;
	- `GOOGLE_CLOUD_PROJECT` ou `FIREBASE_PROJECT_ID` com o Project Id da aplicação.
- O `Project Id` também é inferido do próprio arquivo de service account quando disponível.

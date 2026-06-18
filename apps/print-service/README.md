# MesaFacil Print Service

Serviço local responsável por detectar impressoras instaladas no sistema operacional e enviar comandos de impressão a partir do navegador/web app.

O objetivo do serviço é funcionar do mesmo jeito em qualquer máquina do restaurante:

- descobrir impressoras locais instaladas;
- permitir selecionar a impressora por setor;
- buscar novos pedidos no Firestore;
- imprimir automaticamente cada setor separadamente conforme os pedidos chegam.

## Endpoints

- `GET http://localhost:4891/health`
- `GET http://localhost:4891/config-status`
- `GET http://localhost:4891/printers`
- `POST http://localhost:4891/test-print`
- `POST http://localhost:4891/print`

## Configuração universal por máquina

O padrão recomendado é usar sempre o mesmo caminho de credencial em cada computador.

macOS/Linux:

```bash
~/.config/mesafacil/service-account.json
```

Windows:

```bash
%APPDATA%/MesaFacil/service-account.json
```

Com isso, a máquina não depende de `gcloud auth`, nem de configuração manual diferente por operador.

## Credenciais suportadas

- `FIREBASE_SERVICE_ACCOUNT_JSON`: JSON da service account em texto puro ou base64
- `FIREBASE_SERVICE_ACCOUNT_PATH`: caminho explícito para o JSON
- `GOOGLE_APPLICATION_CREDENTIALS`: alias compatível

Se nenhuma variável for informada, o serviço procura automaticamente no caminho padrão da máquina.

Por padrão, o serviço não depende de ADC/gcloud. Se quiser usar ADC apenas em ambiente de desenvolvimento, habilite:

```bash
export ALLOW_FIREBASE_ADC=true
```

## Execução

```bash
cd apps/print-service
npm install
npm start
```

## Preparação rápida da máquina

macOS/Linux:

```bash
mkdir -p ~/.config/mesafacil
cp /caminho/do/service-account.json ~/.config/mesafacil/service-account.json
chmod 600 ~/.config/mesafacil/service-account.json
```

Depois disso, basta iniciar o serviço:

```bash
node apps/print-service/server.js
```

## Observações

- O serviço escuta apenas em `127.0.0.1` por padrão.
- A impressão usa `printer.printDirect` quando a biblioteca está disponível.
- Quando a biblioteca nativa não está disponível, o serviço tenta usar fallbacks do sistema operacional.
- O worker da fila fica habilitado por padrão com `ENABLE_QUEUE_WORKER=true`.
- O `Project Id` é inferido do arquivo de service account quando disponível.
- O endpoint `config-status` mostra se a máquina está pronta para impressão automática, quantas impressoras foram encontradas e se o Firebase foi conectado.

## Diagnóstico

Se a tela de impressoras por setor não estiver funcionando, valide em ordem:

```bash
curl http://127.0.0.1:4891/health
curl http://127.0.0.1:4891/config-status
curl http://127.0.0.1:4891/printers
```

Para o modo automático funcionar, o `config-status` deve mostrar:

- `firebaseReady: true`
- `active: true`
- pelo menos uma impressora em `printers.items`

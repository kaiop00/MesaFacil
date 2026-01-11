# Integração iFood – Guia Completo

> Data: 19/11/2025  
> Projeto: MesaFacil (branch `develop`)

Este documento detalha o funcionamento da integração com o iFood: fluxo de autenticação (Distributed App), obtenção de catálogo, polling de eventos/pedidos, criação e sincronização de pedidos no MesaFacil, estrutura no Firestore, requisitos de secrets e como testar/deployar.

## 0) Pré‑requisito: Conta de Desenvolvedor iFood e Aplicação
Para habilitar a integração, você precisa de uma conta e uma aplicação de desenvolvedor no iFood (modelo Distributed App).

Observações:
- Ambiente de testes/homologação pode diferir do de produção; valide endpoints e credenciais fornecidas pelo iFood.
- O fluxo Distributed App utiliza userCode (fornecido pela API) que deve ser digitado no Portal do Parceiro para autorizar a integração.

## 1) Visão Geral da Integração
- Padrão: iFood Merchant API (Distributed App)
- Componentes principais (Firebase Functions v2):
  - Autenticação distribuída (Callable): `ifoodRequestUserCode`, `ifoodExchangeCode`, `ifoodRevokeAuth`
  - Catálogo (HTTP): `ifoodGetCatalog`
  - Eventos/Pedidos (Scheduler + Callable): `ifoodPolling` (a cada 1 minuto), `ifoodPollManual`
- Armazenamento: Firestore por restaurante em `restaurantes/{id}/integrations/ifood` e coleções auxiliares.

## 2) Fluxo de Autenticação (Distributed App)
O processo é em duas etapas: solicitar `userCode` e trocar `authorizationCode` por tokens.

1. Solicitar `userCode` (Callable: `ifoodRequestUserCode`)
   - Entrada: `{ idRestaurante }`
   - Ação: POST para `/authentication/v1.0/oauth/userCode` com `clientId` (secret).
   - Retorno: `{ userCode, verificationCode, authorizationCodeVerifier, expiresIn }`
   - Persistência (Firestore – `integrations/ifood`): `verificationCode`, `verificationCodeVerifier`, `authorizationCodeVerifier`, `userCode`, `userCodeExpiresAt`.
   - Uso: o usuário (lojista) digita o `userCode` no Portal do Parceiro iFood para autorizar.

2. Trocar `authorizationCode` por tokens (Callable: `ifoodExchangeCode`)
   - Entrada: `{ idRestaurante, authorizationCode }`
   - Ação: POST para `/authentication/v1.0/oauth/token` (`grantType=authorization_code`) com `clientId`, `clientSecret`, `authorizationCode` e `authorizationCodeVerifier` (recuperado do Firestore).
   - Passo extra: GET `/merchant/v1.0/merchants` para obter `merchantId`.
   - Persistência: `accessToken`, `refreshToken`, `accessTokenExpiry`, `merchantId`, `enabled=true`, `authorizedAt`, limpeza dos códigos temporários.

3. Revogar autorização (Callable: `ifoodRevokeAuth`)
   - Entrada: `{ idRestaurante }`
   - Ação: limpa tokens e desabilita a integração.

Observações importantes:
- Segredos necessários: `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET` (configurados via Firebase secrets).
- Região padrão das Functions: `us-central1` (URLs devem refletir isso).
- O código marca `needsReauthorization=true` em casos de falha de refresh.

## 3) Polling de Eventos e Processamento de Pedidos
O ciclo de sincronização é executado pelo Scheduler a cada 1 minuto.

1. Agendamento (Scheduler): `ifoodPolling`
   - Pré-requisito: Cloud Scheduler e billing habilitados.
   - Passos:
     - Busca integrações ativas: `enabled=true` e `merchantId` + `refreshToken` em `restaurantes/*/integrations/ifood`.
     - Obtém `accessToken` válido (refresh automático se faltam <5 minutos).
     - Chama GET `/events/v1.0/events:polling` com header `x-polling-merchants`.
     - Para cada evento, busca os detalhes do pedido (se `orderId` presente): GET `/order/v1.0/orders/{orderId}`.
     - Deduplicação: verifica/marca evento em `restaurantes/{id}/ifoodEvents/{eventId}`.
     - Persiste pedido em `restaurantes/{id}/ifoodOrders/{orderId}` (modelo completo + raw).
     - Cria/atualiza pedido interno (MesaFacil) e mesa virtual.
     - Acknowledgment: POST `/events/v1.0/events/acknowledgment` com os eventos processados.

2. Disparo manual (Callable): `ifoodPollManual`
   - Entrada: `{ idRestaurante }`
   - Executa o mesmo ciclo apenas para um restaurante, útil para teste/depuração.

3. Criação de Pedido no MesaFacil
   - Mesa virtual: `mesas/ifood-delivery` (criada automaticamente se não existir).
   - Subcoleção: `restaurantes/{id}/mesas/ifood-delivery/pedidos/{pedidoId}` com campos:
     - `items` (mapeados do iFood), `total`, `observacoes` (dados do cliente e observações), `status` (mapeado), `source="ifood"`, `ifoodOrderId`, `ifoodDisplayId`, `criadoEm`.
   - Atualiza o status da mesa virtual conforme pedidos (`livre`, `andamento`, `entregue`).

4. Mapeamento de Status (iFood → MesaFacil)
   - `PLACED` → `andamento`
   - `CONFIRMED` → `andamento`
   - `READY_TO_PICKUP` → `andamento`
   - `DISPATCHED` → `andamento`
   - `CONCLUDED` → `entregue`
   - `CANCELLED` → `cancelado`

5. Sincronização de status (iFood → MesaFacil)
   - Ao detectar mudança, atualiza o pedido na mesa virtual e adiciona histórico `ifoodStatusHistory`.
   - Define timestamps (`finalizadoEm`, `canceladoEm`) quando aplicável.

## 4) Catálogo do iFood
Endpoint HTTP: `ifoodGetCatalog`
- Entrada (JSON): `{ data: { idRestaurante } }` ou `{ idRestaurante }`
- Pré-condição: integração `enabled` com `merchantId` e `accessToken` válido (refresh automático via `grantType=refresh_token`).
- Fluxo:
  1) GET `/catalog/v2.0/merchants/{merchantId}/catalogs` → seleciona o catálogo `AVAILABLE` (ou o primeiro).
  2) GET `/catalog/v2.0/merchants/{merchantId}/catalogs/{catalogId}/categories?include_items=true` → carrega categorias+itens.
  3) Parser padroniza itens/categorias (nome, preço, disponibilidade, complementos/optionGroups, etc.).
- Retorno: `{ success, catalog: { items[], categories[], totalItems, totalCategories }, rawCatalog, fetchedAt }`.

## 5) Estrutura no Firestore
Por restaurante (`restaurantes/{idRestaurante}/...`):
- `integrations/ifood` (documento):
  - Autenticação temporária: `verificationCode`, `verificationCodeVerifier`, `authorizationCodeVerifier`, `userCode`, `userCodeExpiresAt`.
  - Tokens/estado: `accessToken`, `refreshToken`, `accessTokenExpiry`, `merchantId`, `enabled`, `needsReauthorization`, `authorizedAt`, `updatedAt`, `lastError`, `lastErrorAt`, `revokedAt`.
- `ifoodEvents/{eventId}`: marcação de eventos processados (dedupe).
- `ifoodOrders/{orderId}`: dados completos do pedido iFood + `rawData`, `mesaFacilOrderId`, `syncedToMesaFacil`.
- `mesas/ifood-delivery`: mesa virtual para pedidos iFood.
  - `pedidos/{pedidoId}`: pedido do MesaFacil criado a partir do iFood.

Índices:
- O repositório já inclui um índice composto para `movimentos` (estoque). Para coleções específicas do iFood, índices podem ser adicionados conforme consultas futuras.

## 6) Secrets e Configuração
- Necessários (Functions):
  - `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET` (Distributed App)
  - Opcional para Stripe (não iFood), mas usado no projeto: `STRIPE_SECRET_KEY`
- Como definir (produção/emulador):
  - `firebase functions:secrets:set IFOOD_CLIENT_ID`
  - `firebase functions:secrets:set IFOOD_CLIENT_SECRET`
- Em desenvolvimento local, o código usa `defineSecret`; para Stripe há fallback via `.env.local`.

### 6.1) Variáveis de Ambiente (iFood) – o que configurar e onde
- Secrets nas Firebase Functions (produção/emulador):
  - `IFOOD_CLIENT_ID`: Client ID da aplicação Distributed App no iFood.
  - `IFOOD_CLIENT_SECRET`: Client Secret da aplicação.
  - (Opcional – não relacionado ao iFood, mas usado no projeto) `STRIPE_SECRET_KEY`.

- Arquivo local para desenvolvimento (apenas Functions): `functions/.env.local`
  - `IFOOD_CLIENT_ID=...`
  - `IFOOD_CLIENT_SECRET=...`
  - `STRIPE_SECRET_KEY=...` (se for testar Stripe juntos)

- Variáveis do frontend relacionadas a chamadas das Functions (definidas em `.env` na raiz):
  - `VITE_API_BASE_URL` (ou `VITE_FIREBASE_FUNCTIONS_URL`): base URL das Cloud Functions (ex.: `http://127.0.0.1:5001/<project>/us-central1` no dev; `https://us-central1-<project>.cloudfunctions.net` em prod). Usado pelos serviços que consomem endpoints HTTP da integração iFood.
  - `VITE_APP_URL`: URL da aplicação web (útil para cenários de redirecionamento).

Importante:
- As credenciais do iFood (Client ID/Secret) NUNCA devem ir para o frontend; mantenha-as apenas como secrets nas Functions.
- Se usar App Hosting/Cloud Run para o frontend, não é necessário expor variáveis de iFood no `apphosting.yaml` (elas são exclusivas das Functions).

## 7) Contratos dos Endpoints
Resumo dos principais endpoints e formatos.

### 7.1 ifoodRequestUserCode (Callable)
- Entrada: `{ idRestaurante: string }`
- Saída: `{ userCode: string, verificationCode: string, authorizationCodeVerifier: string|null, expiresIn: number }`
- Erros comuns: 401/403 (credenciais inválidas ou app não aprovado), 4xx genéricos.

### 7.2 ifoodExchangeCode (Callable)
- Entrada: `{ idRestaurante: string, authorizationCode: string }`
- Saída: `{ success: true, merchantId?: string, message: string }`
- Efeitos colaterais: salva tokens, `merchantId`, habilita integração; limpa códigos temporários.

### 7.3 ifoodRevokeAuth (Callable)
- Entrada: `{ idRestaurante: string }`
- Saída: `{ success: true, message: string }`
- Efeito: limpa tokens e desabilita a integração.

### 7.4 ifoodGetCatalog (HTTP)
- Método: `POST` (CORS liberado, responde a `OPTIONS`)
- Corpo: `{ data: { idRestaurante } }` (ou `{ idRestaurante }`)
- Saída: `{ success, catalog, rawCatalog, fetchedAt }`

### 7.5 ifoodPolling (Scheduler)
- Agenda: a cada 1 min; sem entrada/saída HTTP; usa logs.
- Requer: Cloud Scheduler + billing + secrets válidos.

### 7.6 ifoodPollManual (Callable)
- Entrada: `{ idRestaurante: string }`
- Saída: `{ success: boolean, eventCount: number, message: string }`

## 8) Testes Locais (Emulador)
- Configure secrets via CLI ou `.env.local` (apenas Stripe tem fallback explícito).
- Inicie o emulador de Functions em `functions/`: `npm run serve`
- Chame Callables via SDK do Firebase do projeto ou ferramentas (ex.: Postman com `functions:shell`).
- Endpoints HTTP (ex.: `ifoodGetCatalog`):
  - URL (padrão): `http://127.0.0.1:5001/<projectId>/us-central1/ifoodGetCatalog`
  - Headers: `Content-Type: application/json`
  - Body: `{ "data": { "idRestaurante": "..." } }`

Observações:
- A autorização distribuída requer passo no Portal iFood para inserir `userCode`.
- Para testes de polling, use `ifoodPollManual` com um restaurante configurado.

## 9) Deploy
- Ver docs/DEPLOY_E_DEPENDENCIAS.md para fluxo de deploy e emuladores.
- Passos chaves:
  1) Defina secrets `IFOOD_CLIENT_ID/SECRET` no Firebase.
  2) Deploy das Functions: `firebase deploy --only functions` (ou scripts package).
  3) Ative Cloud Scheduler (e billing) para o `ifoodPolling`.

## 10) Tratamento de Erros e Edge Cases
- 401/403 nas rotas de autenticação iFood:
  - Verifique `IFOOD_CLIENT_ID/SECRET` e aprovação da app no portal iFood.
- `merchantId` ausente após troca do código:
  - A API de merchants pode falhar; a integração segue sem `merchantId` não funcional. Reautentique.
- Refresh token inválido/expirado:
  - O código marca `needsReauthorization=true` e desabilita a integração (`enabled=false`). Solicite nova autorização.
- Polling com 204 No Content:
  - Sem eventos; fluxo normal.
- ACK de eventos falha:
  - Os eventos podem reaparecer; verifique logs e status de autenticação.
- Mapeamento de status não esperado:
  - Fallback: `andamento`. Revise tabela de mapeamento se necessário.

## 11) Segurança
- Secrets nunca no código; usar Firebase secrets.  
- Tokens iFood armazenados por restaurante e rotacionados automaticamente.
- CORS liberado apenas onde necessário (HTTP endpoints). Callable exige SDK.

## 12) Referências
- Código: `functions/index.js`, `functions/ifood-auth-distributed.js`, `functions/ifood-polling.js`, `functions/ifood-catalog.js`
- Console iFood Developer: documentação da Distributed App e APIs Merchant/Event/Catalog
- Guia de deploy e emuladores: `docs/DEPLOY_E_DEPENDENCIAS.md`

---
Mantenha este guia sincronizado a cada mudança nos endpoints ou campos do Firestore ligados à integração iFood.
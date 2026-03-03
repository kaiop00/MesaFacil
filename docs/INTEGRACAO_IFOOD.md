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
  - Eventos/Pedidos (Scheduler + Callable): `ifoodPolling` (a cada 30 segundos), `ifoodPollManual`
  - Ações sobre pedidos (Callable): `ifoodConfirmOrder`, `ifoodDispatchOrder`, `ifoodMarkReadyToPickup`, `ifoodGetCancellationReasons`, `ifoodRequestCancellation`
- Armazenamento: Firestore por restaurante em `restaurantes/{id}/integrations/ifood` e coleções auxiliares.
- Tipos de pedido suportados: DELIVERY (IMMEDIATE e SCHEDULED), TAKEOUT

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
O ciclo de sincronização é executado pelo Scheduler a cada 30 segundos (conforme requisitos de homologação iFood).

1. Agendamento (Scheduler): `ifoodPolling`
   - Pré-requisito: Cloud Scheduler e billing habilitados.
   - Frequência: **a cada 30 segundos** (requisito crítico para homologação).
   - Passos:
     - Busca integrações ativas: `enabled=true` e `merchantId` + `refreshToken` em `restaurantes/*/integrations/ifood`.
     - Obtém `accessToken` válido (refresh automático se faltam <5 minutos).
     - Chama GET `/events/v1.0/events:polling` com header `x-polling-merchants`.
     - Para cada evento, busca os detalhes do pedido (se `orderId` presente): GET `/order/v1.0/orders/{orderId}`.
     - Deduplicação: verifica/marca evento em `restaurantes/{id}/ifoodEvents/{eventId}`.
     - Persiste pedido em `restaurantes/{id}/ifoodOrders/{orderId}` (modelo completo + raw).
     - Cria/atualiza pedido interno (MesaFacil) e mesa virtual (separada por tipo: delivery/takeout).
     - Acknowledgment: POST `/events/v1.0/events/acknowledgment` com os eventos processados.

2. Disparo manual (Callable): `ifoodPollManual`
   - Entrada: `{ idRestaurante }`
   - Executa o mesmo ciclo apenas para um restaurante, útil para teste/depuração.

3. Criação de Pedido no MesaFacil
   - Mesa virtual unificada (criada automaticamente):
     - `mesas/ifood`: todos os pedidos iFood (DELIVERY e TAKEOUT)
   - Subcoleção: `restaurantes/{id}/mesas/{mesaId}/pedidos/{pedidoId}` com campos:
     - `items` (mapeados do iFood), `total`, `observacoes` (dados do cliente e observações)
     - `status` (mapeado), `source="ifood"`, `ifoodOrderId`, `ifoodDisplayId`
     - `orderType` ("DELIVERY" ou "TAKEOUT")
     - `orderTiming` ("IMMEDIATE" ou "SCHEDULED")
     - `scheduledFor` (timestamp do agendamento, se SCHEDULED)
     - `isScheduled` (boolean)
     - `criadoEm`
     - Dados completos de: pagamento (com bandeira e troco), cupons, código de coleta, CPF/CNPJ
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

## 3.1) Ações sobre Pedidos (iFood Actions API)
O sistema implementa endpoints para executar ações sobre pedidos diretamente na API do iFood, conforme requisitos de homologação.

### Confirmar Pedido (Callable: `ifoodConfirmOrder`)
- Entrada: `{ idRestaurante: string, orderId: string }`
- Ação: POST `/order/v1.0/orders/{orderId}/confirm`
- Efeito: confirma o pedido no iFood e atualiza status local
- Uso: necessário para todos os tipos de pedido (DELIVERY, TAKEOUT)

### Despachar Pedido (Callable: `ifoodDispatchOrder`)
- Entrada: `{ idRestaurante: string, orderId: string }`
- Ação: POST `/order/v1.0/orders/{orderId}/dispatch`
- Efeito: marca pedido como "saiu para entrega" no iFood
- Uso: apenas para pedidos DELIVERY

### Marcar como Pronto (Callable: `ifoodMarkReadyToPickup`)
- Entrada: `{ idRestaurante: string, orderId: string }`
- Ação: POST `/order/v1.0/orders/{orderId}/readyToPickup`
- Efeito: notifica cliente que pedido está pronto para retirada
- Uso: apenas para pedidos TAKEOUT

### Buscar Motivos de Cancelamento (Callable: `ifoodGetCancellationReasons`)
- Entrada: `{ idRestaurante: string, orderId: string }`
- Ação: GET `/order/v1.0/orders/{orderId}/cancellationReasons`
- Retorno: lista de motivos disponíveis com códigos
- Uso: obrigatório consultar antes de cancelar

### Cancelar Pedido (Callable: `ifoodRequestCancellation`)
- Entrada: `{ idRestaurante: string, orderId: string, cancellationCode: string, reason?: string }`
- Ação: POST `/order/v1.0/orders/{orderId}/requestCancellation`
- Efeito: solicita cancelamento do pedido com motivo específico
- Observação: sempre consultar motivos disponíveis antes de cancelar

## 3.2) Tipos de Pedido e Fluxos Específicos

### DELIVERY IMMEDIATE (Entrega Imediata)
- Fluxo: PLACED → CONFIRMED → DISPATCHED → CONCLUDED
- Mesa virtual: `ifood`
- Ações disponíveis: confirmar → despachar
- Informações exibidas: endereço completo, taxa de entrega, observações de entrega

### DELIVERY SCHEDULED (Entrega Agendada)
- Fluxo: igual ao IMMEDIATE, mas com data/hora de agendamento
- Campo adicional: `scheduledFor` (timestamp)
- Exibição: data e hora do agendamento devem ser destacadas
- Mesa virtual: `ifood`
- Observação: pedido deve ser preparado considerando o horário agendado

### TAKEOUT (Pra Retirar)
- Fluxo: PLACED → CONFIRMED → READY_TO_PICKUP → CONCLUDED
- Mesa virtual: `ifood`
- Ações disponíveis: confirmar → marcar como pronto
- Campo importante: código de coleta (`displayId`)
- Sem taxa de entrega

## 3.3) Informações Detalhadas do Pedido

### Dados de Pagamento
O sistema captura e exibe informações completas de pagamento:
- **Cartão de Crédito/Débito:**
  - Bandeira (VISA, MASTERCARD, ELO, etc.)
  - Tipo (crédito/débito)
  - Pré-pago (sim/não)
- **Dinheiro:**
  - Valor para troco (`changeFor`)
  - Cálculo automático do troco a devolver
- **Outros métodos:**
  - Vale-refeição/alimentação
  - PIX (se disponível)

### Cupons e Descontos
- Campo `benefits` contém array de cupons aplicados:
  - Valor do desconto
  - Responsável pelo subsídio (iFood ou Restaurante)
  - Target (entrega, item específico, carrinho)
- Exibição: valor total de descontos e detalhamento por cupom

### Código de Coleta
- Campo `displayId`: código alfanumérico único para retirada
- Exibição: destacado em fonte grande/monospace para fácil leitura
- Uso: cliente apresenta este código ao retirar pedido TAKEOUT

### CPF/CNPJ do Cliente
- Campo `customer.documentNumber`: CPF ou CNPJ quando fornecido
- Exibição condicional: apenas se presente
- Formatação: máscaras para CPF (000.000.000-00) e CNPJ (00.000.000/0000-00)

### Observações de Entrega
- Campo `delivery.observations`: instruções específicas do cliente
- Exemplos: "Entregar na portaria", "Ligar ao chegar"
- Exibição: destacada na área de entrega

## 3.4) Plataforma de Negociação (Handshake)
Sistema para negociar alterações no pedido antes da confirmação.

### Eventos de Handshake
- `HANDSHAKE_REQUESTED`: cliente ou sistema iniciou negociação
- `HANDSHAKE_ACCEPTED`: negociação aceita
- `HANDSHAKE_DENIED`: negociação recusada

### Casos de Uso
- Item indisponível: propor substituição ou remoção
- Tempo de preparo: informar atraso
- Alteração de valor: ajustar preço por indisponibilidade

### Implementação
- Detecta eventos de handshake no polling
- Marca pedido com `needsManualReview=true`
- Armazena detalhes em `handshakeDetails`
- Requer ação manual do restaurante via interface

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
- `ifoodOrders/{orderId}`: dados completos do pedido iFood + campos adicionais:
  - `rawData`: payload original da API iFood
  - `mesaFacilOrderId`: referência ao pedido criado no MesaFacil
  - `syncedToMesaFacil`: boolean indicando sincronização
  - `orderType`: "DELIVERY" ou "TAKEOUT"
  - `orderTiming`: "IMMEDIATE" ou "SCHEDULED"
  - `scheduledFor`: timestamp (apenas para SCHEDULED)
  - `isScheduled`: boolean
  - `payments`: array com detalhes completos (bandeira, tipo, troco)
  - `benefits`: array de cupons/descontos aplicados
  - `displayId`: código de coleta
  - `customer.documentNumber`: CPF/CNPJ
  - `delivery.observations`: observações de entrega
  - `handshakeStatus`: status da negociação (se aplicável)
  - `handshakeDetails`: detalhes da negociação
  - `needsManualReview`: flag para pedidos que requerem revisão
- `mesas/ifood`: mesa virtual unificada para todos os pedidos iFood (DELIVERY e TAKEOUT).
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

### 7.1 Autenticação

#### ifoodRequestUserCode (Callable)
- Entrada: `{ idRestaurante: string }`
- Saída: `{ userCode: string, verificationCode: string, authorizationCodeVerifier: string|null, expiresIn: number }`
- Erros comuns: 401/403 (credenciais inválidas ou app não aprovado), 4xx genéricos.

#### ifoodExchangeCode (Callable)
- Entrada: `{ idRestaurante: string, authorizationCode: string }`
- Saída: `{ success: true, merchantId?: string, message: string }`
- Efeitos colaterais: salva tokens, `merchantId`, habilita integração; limpa códigos temporários.

#### ifoodRevokeAuth (Callable)
- Entrada: `{ idRestaurante: string }`
- Saída: `{ success: true, message: string }`
- Efeito: limpa tokens e desabilita a integração.

### 7.2 Catálogo

#### ifoodGetCatalog (HTTP)
- Método: `POST` (CORS liberado, responde a `OPTIONS`)
- Corpo: `{ data: { idRestaurante } }` (ou `{ idRestaurante }`)
- Saída: `{ success, catalog, rawCatalog, fetchedAt }`

### 7.3 Polling

#### ifoodPolling (Scheduler)
- Agenda: a cada 30 segundos; sem entrada/saída HTTP; usa logs.
- Requer: Cloud Scheduler + billing + secrets válidos.

#### ifoodPollManual (Callable)
- Entrada: `{ idRestaurante: string }`
- Saída: `{ success: boolean, eventCount: number, message: string }`

### 7.4 Ações sobre Pedidos

#### ifoodConfirmOrder (Callable)
- Entrada: `{ idRestaurante: string, orderId: string }`
- Saída: `{ success: true, message: string }`
- Efeito: confirma pedido no iFood e atualiza status local

#### ifoodDispatchOrder (Callable)
- Entrada: `{ idRestaurante: string, orderId: string }`
- Saída: `{ success: true, message: string }`
- Efeito: marca pedido como despachado (saiu para entrega)
- Uso: apenas DELIVERY

#### ifoodMarkReadyToPickup (Callable)
- Entrada: `{ idRestaurante: string, orderId: string }`
- Saída: `{ success: true, message: string }`
- Efeito: marca pedido como pronto para retirada
- Uso: apenas TAKEOUT

#### ifoodGetCancellationReasons (Callable)
- Entrada: `{ idRestaurante: string, orderId: string }`
- Saída: `{ success: true, reasons: Array<{code: string, description: string}> }`
- Efeito: retorna lista de motivos disponíveis para cancelamento

#### ifoodRequestCancellation (Callable)
- Entrada: `{ idRestaurante: string, orderId: string, cancellationCode: string, reason?: string }`
- Saída: `{ success: true, message: string }`
- Efeito: solicita cancelamento do pedido no iFood
- Observação: sempre consultar motivos antes de cancelar

## 8) Testes Locais (Emulador)
- Configure secrets via CLI ou `.env.local` (apenas Stripe tem fallback explícito).
- Inicie o emulador de Functions em `functions/`: `npm run serve`
- Chame Callables via SDK do Firebase do projeto ou ferramentas (ex.: Postman com `functions:shell`).
- Endpoints HTTP (ex.: `ifoodGetCatalog`):
  - URL (padrão): `http://127.0.0.1:5001/<projectId>/us-central1/ifoodGetCatalog`
  - Headers: `Content-Type: application/json`
  - Body: `{ "data": { "idRestaurante": "..." } }`

### Testes de Funcionalidades Específicas

#### Teste de Polling (30 segundos)
- Verifique nos logs que o polling executa a cada 30 segundos
- Monitore: `[ifoodPolling]` nos logs do emulador

#### Teste de Tipos de Pedido
- **DELIVERY IMMEDIATE:** pedido comum de entrega
- **DELIVERY SCHEDULED:** verifique se `scheduledFor` está presente e exibido
- **TAKEOUT:** verifique criação na mesa unificada `ifood`

#### Teste de Ações
1. Crie pedido de teste no iFood
2. Use `ifoodPollManual` para buscar
3. Teste cada ação:
   - Confirmar: `ifoodConfirmOrder({ idRestaurante, orderId })`
   - Despachar: `ifoodDispatchOrder({ idRestaurante, orderId })`
   - Pronto: `ifoodMarkReadyToPickup({ idRestaurante, orderId })`
   - Cancelar: 
     - Buscar motivos: `ifoodGetCancellationReasons({ idRestaurante, orderId })`
     - Cancelar: `ifoodRequestCancellation({ idRestaurante, orderId, cancellationCode })`

#### Teste de Dados Detalhados
- **Pagamento:** verifique bandeira de cartão e cálculo de troco para dinheiro
- **Cupons:** crie pedido com cupom e verifique campo `benefits`
- **Código de coleta:** verifique `displayId` em pedidos TAKEOUT
- **CPF/CNPJ:** crie pedido com documento e verifique `customer.documentNumber`
- **Observações:** adicione observações de entrega e verifique `delivery.observations`

Observações:
- A autorização distribuída requer passo no Portal iFood para inserir `userCode`.
- Para testes de polling, use `ifoodPollManual` com um restaurante configurado.
- Testes de handshake requerem configuração específica no iFood (opcional).

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
- Erros de ações sobre pedidos:
  - **409 Conflict:** ação já executada ou estado inválido
  - **404 Not Found:** pedido não encontrado
  - **403 Forbidden:** ação não permitida no estado atual
  - Log detalhado: sempre verifique `lastError` no documento da integração
- Pedidos agendados:
  - Validar presença de `scheduledFor` quando `orderTiming=SCHEDULED`
  - Alertar se data/hora de agendamento for inconsistente
- Pedidos TAKEOUT sem código de coleta:
  - Sempre validar presença de `displayId`
- Handshake não processado:
  - Marcar com `needsManualReview=true` para revisão do restaurante
  - Notificar equipe via sistema de alertas (se disponível)
- Falha ao calcular troco:
  - Validar: `payment.changeFor > orderTotal`
  - Exibir mensagem de erro se cálculo for inconsistente

## 11) Segurança
- Secrets nunca no código; usar Firebase secrets.  
- Tokens iFood armazenados por restaurante e rotacionados automaticamente.
- CORS liberado apenas onde necessário (HTTP endpoints). Callable exige SDK.

## 12) Referências
- Código: 
  - `functions/index.js` (exports)
  - `functions/ifood-auth-distributed.js` (autenticação)
  - `functions/ifood-polling.js` (polling e processamento)
  - `functions/ifood-catalog.js` (catálogo)
  - `functions/ifood-actions.js` (ações sobre pedidos)
- Documentação oficial iFood:
  - [Distributed App Flow](https://developer.ifood.com.br/pt-BR/docs/guides/authentication/distributed-app)
  - [Order Events](https://developer.ifood.com.br/pt-BR/docs/guides/modules/order/order-events)
  - [Order API Reference](https://developer.ifood.com.br/pt-BR/docs/references#operations-tag-Order)
  - [Critérios de Homologação](https://developer.ifood.com.br/pt-BR/docs/guides/modules/order/homologation/)
  - [Scheduled Orders](https://developer.ifood.com.br/pt-BR/docs/guides/modules/order/scheduled-orders)
  - [Takeout Orders](https://developer.ifood.com.br/pt-BR/docs/guides/modules/order/takeout)
  - [Handshake Platform](https://developer.ifood.com.br/pt-BR/docs/guides/modules/order/handshake-platform/)
  - [Gestor de Pedidos Web](https://gestordepedidos.ifood.com.br/#/login)
- Documentação interna:
  - `docs/DEPLOY_E_DEPENDENCIAS.md` (deploy e emuladores)
  - `docs/IFOOD_HOMOLOGACAO_REQUISITOS.md` (requisitos e checklist)
  - `docs/IFOOD_ORDER_ACTIONS.md` (detalhes das ações)

## 13) Próximos Passos e Roadmap

### Fase 1: Implementado ✅
- ✅ Autenticação distribuída
- ✅ Polling de eventos (30 segundos)
- ✅ Processamento de pedidos DELIVERY IMMEDIATE
- ✅ Sincronização de status
- ✅ Deduplicação de eventos

### Fase 2: Em Implementação 🚧
- 🚧 Endpoints de ações sobre pedidos
- 🚧 Suporte para DELIVERY SCHEDULED
- 🚧 Suporte para TAKEOUT
- 🚧 Dados detalhados de pagamento
- 🚧 Cupons e descontos
- 🚧 Informações adicionais (CPF, observações)

### Fase 3: Planejado 📋
- 📋 Plataforma de Negociação (Handshake)
- 📋 Interface de gerenciamento de pedidos iFood
- 📋 Notificações push para novos pedidos
- 📋 Métricas e analytics de pedidos iFood
- 📋 Sincronização bidirecional de catálogo
- 📋 Webhooks (alternativa ao polling)

### Homologação iFood
Para solicitar homologação, o sistema deve atender aos requisitos listados em `IFOOD_HOMOLOGACAO_REQUISITOS.md`, incluindo:
- Polling a cada 30 segundos ✅
- Suporte para todos os tipos de pedido (DELIVERY, TAKEOUT, IMMEDIATE, SCHEDULED) 🚧
- Todas as ações sobre pedidos implementadas 🚧
- Exibição de informações detalhadas 🚧
- Testes completos em ambiente de homologação 📋

---
Mantenha este guia sincronizado a cada mudança nos endpoints ou campos do Firestore ligados à integração iFood.
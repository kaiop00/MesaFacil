# Resumo Rápido — Planos (MesaFácil)

Documento conciso com os pontos essenciais sobre o sistema de planos, integrações e onde estão os arquivos relevantes no repositório.

## Visão geral
- Tiers: `free`, `monthly`, `bimonthly`, `quarterly`, `semiannual`.
- Objetivo: aplicar limites e liberar/ocultar features por plano (produtos, mesas, dashboard, relatórios, estoque, personalização, promoções, funcionários).
- Fonte de verdade das assinaturas: Stripe. Firestore armazena apenas `stripeCustomerId` e `stripeSubscriptionId`; o plano atual é consultado no Stripe.

## Planos — descrição por nível
- free
	- Limites: até 5 produtos, até 2 mesas.
	- Acesso: dashboard básico, pedidos básicos, relatórios diários, promoções liberadas.
	- Uso: ideal para testes e pequenos estabelecimentos que começam a operar.

- monthly
	- Limites: produtos e mesas ilimitados, funcionários ilimitados.
	- Acesso: dashboard completo (gráficos), relatórios diário/semana/mês, controle de estoque (itens e movimentações), gerenciamento de funcionários, prioridade no suporte.
	- Uso: operação plena com analytics, estoque, equipe e remoção de limites.

- bimonthly
	- Acrescenta: relatórios bimestrais.
	- Uso: restaurantes que precisam de relatórios agregados mais longos.

- quarterly
	- Acrescenta: personalização de layout (cores, logo), relatórios trimestrais.
	- Uso: marcas que precisam de identidade visual e relatórios agregados.

- semiannual
	- Tudo incluso: backup automático e suporte premium.
	- Uso: clientes com operação maior que precisam de backup e suporte diferenciado.

## Código / componentes no app
- `src/constants/planFeatures.js` — feature flags e `PLAN_FEATURE_MAP`.
	- `FEATURE_FLAGS`: constantes como `BASIC_DASHBOARD`, `FULL_DASHBOARD`, `INVENTORY_CONTROL`, `PROMOTIONS_ADS`, `CUSTOM_LAYOUT`, `EMPLOYEE_MANAGEMENT`, etc. Use essas flags para verificar acesso.
	- `PLAN_FEATURE_MAP`: objeto que mapeia cada `planId` para um array de `FEATURE_FLAGS` habilitados. Ex.: `PLAN_FEATURE_MAP.free = [FEATURE_FLAGS.BASIC_DASHBOARD, FEATURE_FLAGS.BASIC_ORDERS, FEATURE_FLAGS.DAILY_REPORTS, FEATURE_FLAGS.PROMOTIONS_ADS]`.
- `src/contexts/AuthContext.jsx` — carrega `stripeCustomerId` e consulta `stripeService.getCurrentPlan()`.
- `src/hooks/usePlanManagement.js` e `src/hooks/usePlanPermissions.js` — gerenciamento e checagem de permissões.
- `src/services/stripeService.js` — mapeamento PriceID ↔ planId e `getCurrentPlan()` (verificar neste arquivo no projeto).
	- `mapStripePriceToPlanId(stripePriceId)` — converte priceId retornado pela subscription em `planId` interno.
	- `getCurrentPlan(stripeCustomerId)` — busca a subscription ativa no Stripe e retorna `{ planId, status, expiresAt, stripeSubscriptionId }`.
- Components: `PlanGate.jsx`, `FeatureLocked.jsx`, `UpgradePrompt.jsx`, `LimitCounter.jsx`, `PlanBadge.jsx` (em `src/components`).
- Rotas e UI: `src/routes/index.jsx`, `src/layouts/Sidebar.jsx`, e as features em `src/features/*` (foodList, config, dashboard, reports, items, promotions, users).

## Fluxo essencial do Stripe (resumido)
1. Usuário inicia checkout (frontend) → backend cria Checkout Session (POST `/create-checkout-session`).
2. Stripe Checkout → redireciona para `/payment-success?session_id=...`.
3. PaymentSuccessPage chama `/verify-session/:sessionId` (backend) e obtém `customerId` e `subscriptionId`.
4. Backend/Firebase Function salva `stripeCustomerId` e `stripeSubscriptionId` no documento do usuário.
5. Na próxima carga (AuthContext), `stripeService.getCurrentPlan(stripeCustomerId)` retorna `{ planId, status, expiresAt }` e app aplica limites/features.

## Comandos / testes rápidos
- Iniciar frontend (dev): `bun run dev` ou `npm run dev` conforme seu setup.
- Deploy Functions (Firebase):
```
cd functions
firebase deploy --only functions
```
- Configurar secret do Stripe nas Functions:
```
firebase functions:secrets:set STRIPE_SECRET_KEY
```

## Variáveis de ambiente relevantes
- Frontend (.env / Vite):
	- `VITE_STRIPE_PUBLISHABLE_KEY` — chave pública do Stripe.
	- `VITE_STRIPE_MONTHLY_PRICE_ID`, `VITE_STRIPE_BIMONTHLY_PRICE_ID`, `VITE_STRIPE_QUARTERLY_PRICE_ID`, `VITE_STRIPE_SEMIANNUAL_PRICE_ID` — Price IDs configurados no Stripe Dashboard.
	- `VITE_API_BASE_URL` — URL do backend/Functions.

- Backend / Functions:
	- `STRIPE_SECRET_KEY` — armazenar como Firebase Secret ou variável de ambiente segura.

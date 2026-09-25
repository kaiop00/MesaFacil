# Controle de assinatura e bloqueio de acesso — MesaFácil

## O que foi implementado

- Webhook Stripe como fonte de verdade do status da assinatura.
- Status `active` e `trialing`: acesso normal.
- Status `past_due`: período de tolerância de 3 dias.
- Status `unpaid`, `canceled` e `incomplete_expired`: acesso bloqueado.
- Após 3 dias de `past_due`, o monitor diário bloqueia automaticamente.
- Tela de acesso bloqueado integrada à seleção de planos.
- Pagamento aprovado pelo Checkout sincroniza a assinatura e libera o acesso automaticamente.
- Assinatura regularizada durante a tolerância também gera notificação de restauração.
- Notificações de cobrança: 10, 5, 3, 1 e 0 dias antes do vencimento.
- Notificações de falha de pagamento, início da tolerância, bloqueio e restauração.
- Notificações do fim do teste grátis usam o mesmo centro de notificações.
- Regras do Firestore impedem o acesso às coleções privadas enquanto `subscription.accessBlocked == true`.

## Configuração do Stripe

Crie um endpoint de webhook no Stripe apontando para:

`https://us-central1-projectmesafacil.cloudfunctions.net/stripeWebhook`

Selecione pelo menos estes eventos:

- `checkout.session.completed`
- `invoice.payment_failed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Depois configure o segredo da assinatura do webhook no Firebase Secret Manager:

```bash
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

O valor solicitado pelo Firebase CLI é o `whsec_...` exibido pelo Stripe para esse endpoint.

O projeto já utiliza `STRIPE_SECRET_KEY`; não coloque nenhuma chave secreta no frontend ou no `.env` versionado.

## Deploy

```bash
firebase deploy --only functions
firebase deploy --only firestore:rules
```

Depois faça o build/deploy do frontend normalmente:

```bash
npm run build
firebase deploy --only hosting
```

## Estrutura gravada no restaurante

O webhook mantém `restaurantes/{idRestaurante}.subscription` com informações como:

- `status`
- `stripeSubscriptionId`
- `stripePriceId`
- `planId`
- `currentPeriodStart`
- `currentPeriodEnd`
- `cancelAtPeriodEnd`
- `graceUntil`
- `paymentFailedAt`
- `accessBlocked`

## Fluxo de recuperação

1. A cobrança falha.
2. O Stripe envia `invoice.payment_failed` e/ou altera a assinatura para `past_due`.
3. O MesaFácil inicia 3 dias de tolerância e notifica o cliente.
4. Se o pagamento for regularizado, o Stripe envia um evento de sucesso/atualização e o acesso volta automaticamente.
5. Se a tolerância terminar sem pagamento, o monitor diário define `accessBlocked = true`.
6. Ao entrar no sistema, o cliente é encaminhado para `/selecionar-plano?blocked=1`.
7. Ele escolhe Mensal, Bimestral ou Semestral, paga no Stripe Checkout e retorna para `/payment-success`.
8. A assinatura é sincronizada e o acesso é liberado novamente.

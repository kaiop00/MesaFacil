# Stripe Temporariamente Desativado

## ⚠️ Status Atual
O sistema de pagamento Stripe está **TEMPORARIAMENTE DESATIVADO** neste projeto.

## 🎯 O que foi alterado?

### 1. **stripeService.js** (`src/services/stripeService.js`)
- Adicionada flag `STRIPE_TEMPORARILY_DISABLED = true` no início do arquivo
- Todos os métodos foram modificados para retornar dados simulados quando a flag está ativa
- Os usuários recebem acesso ao plano **semiannual** (premium) automaticamente
- Nenhum código foi removido, apenas suspenso temporariamente

### 2. **usePlanManagement.js** (`src/hooks/usePlanManagement.js`)
- Modificado para retornar plano premium em caso de erro
- Garante que todos os usuários tenham acesso irrestrito às funcionalidades

### 3. **PlanSelectionPage.jsx** (`src/features/auth/pages/planSelection/PlanSelectionPage.jsx`)
- Adicionada flag local `STRIPE_DISABLED = true` no método `handleContinue`
- Exibe aviso visual sobre o sistema de pagamento estar desativado
- Redireciona usuários diretamente para a home sem processar pagamento

### 4. **Header.jsx** (`src/layouts/Header.jsx`)
- Adicionado badge "Acesso Premium Liberado" visível no cabeçalho
- Indica claramente que o sistema está em modo de acesso liberado

## 🔄 Como Reativar o Stripe

Quando a conta do Stripe for reativada, siga estes passos:

### Passo 1: Reativar no stripeService.js
```javascript
// Altere de:
const STRIPE_TEMPORARILY_DISABLED = true;

// Para:
const STRIPE_TEMPORARILY_DISABLED = false;
```

### Passo 2: Reativar no PlanSelectionPage.jsx
```javascript
// No método handleContinue, altere de:
const STRIPE_DISABLED = true;

// Para:
const STRIPE_DISABLED = false;
```

### Passo 3: (Opcional) Remover avisos visuais
- Remover o banner de aviso em `PlanSelectionPage.jsx` (linhas ~120-145)
- Remover o badge "Acesso Premium Liberado" em `Header.jsx` (linhas ~113-119)

### Passo 4: Testar
1. Verificar se o Stripe Checkout está funcionando
2. Confirmar que as verificações de plano estão ativas
3. Testar criação de nova assinatura
4. Verificar portal de gerenciamento de assinaturas

## 📋 Comportamento Atual (Stripe Desativado)

### Para Usuários:
- ✅ Acesso completo a todas as funcionalidades premium
- ✅ Sem necessidade de pagamento
- ✅ Plano semiannual concedido automaticamente (expira em 1 ano)
- ✅ Avisos visuais claros sobre o status temporário

### Para Desenvolvedores:
- ⚠️ Nenhuma chamada real à API do Stripe
- ⚠️ Dados de assinatura são simulados (mock)
- ⚠️ Checkout retorna URL simulada
- ⚠️ Todas as verificações de plano retornam acesso permitido

## 🚨 Importante

**NÃO REMOVA CÓDIGO!** 
Toda a funcionalidade do Stripe está preservada e pode ser reativada simplesmente alterando as flags mencionadas acima.

## 📝 Arquivos Modificados

1. `/src/services/stripeService.js` - Principal arquivo de integração
2. `/src/hooks/usePlanManagement.js` - Gerenciamento de planos
3. `/src/features/auth/pages/planSelection/PlanSelectionPage.jsx` - Página de seleção de planos
4. `/src/layouts/Header.jsx` - Cabeçalho com aviso visual

## 🔍 Como Identificar se o Stripe está Desativado

Procure por estas flags nos arquivos:
- `STRIPE_TEMPORARILY_DISABLED = true` em `stripeService.js`
- `STRIPE_DISABLED = true` em `PlanSelectionPage.jsx`

No console do navegador, você verá mensagens como:
```
⚠️ STRIPE TEMPORARIAMENTE DESATIVADO - Todas as funcionalidades de plano estão liberadas
```

---

**Data de Desativação**: 7 de Janeiro de 2026
**Motivo**: Conta do Stripe temporariamente desativada
**Reativação Prevista**: A definir

# Integração WhatsApp - Pedidos com Origem e Dados do Cliente

## Visão Geral

Este documento descreve a implementação completa da integração WhatsApp para pedidos delivery e retirada, incluindo:
- Captura de origem do pedido (WhatsApp, iFood, Mesa Convencional)
- **Escolha do tipo de entrega (Delivery ou Retirada)**
- Coleta e armazenamento de dados do cliente no IndexedDB
- Exibição da origem no painel de pedidos do restaurante
- Geração de links para compartilhamento via WhatsApp

## Arquitetura

### 1. Origens de Pedidos

O sistema distingue entre três origens:

| Origem | Descrição | Como é identificado |
|--------|-----------|---------------------|
| `whatsapp` | Pedidos via mesa virtual WhatsApp | Mesa com ID `mesa-whatsapp-delivery` |
| `ifood` | Pedidos da integração iFood | Definido automaticamente pelo webhook |
| `mesaconvencional` | Pedidos via QR Code ou direto | Padrão quando não é WhatsApp nem iFood |

### 1.1 Tipos de Entrega (WhatsApp)

Para pedidos WhatsApp, o cliente pode escolher entre:

| Tipo | Descrição | Dados Necessários |
|------|-----------|-------------------|
| `delivery` | Entrega no endereço do cliente | Nome, CPF, Telefone, **Endereço completo** |
| `retirada` | Cliente retira no restaurante | Nome, CPF, Telefone |

### 2. Mesa Virtual WhatsApp

A integração usa uma **mesa virtual** fixa com ID `mesa-whatsapp-delivery`:

- **Criação**: Automática quando ativada nas configurações (Header → Configurações → 📬 Pedidos WhatsApp)
- **Propriedades**:
  - `numero: "WhatsApp"`
  - `tipo: "delivery"`
  - `isVirtual: true`
  - `isWhatsApp: true`
  - `orderOrigin: "whatsapp"`
- **URL**: `/mesa/{slug}-mesa-whatsapp-delivery/pedido`

### 3. Fluxo de Pedido WhatsApp

```
1. Restaurante ativa WhatsApp nas configurações
   - Sistema cria mesa virtual 'mesa-whatsapp-delivery'
   - Link é gerado automaticamente

2. Cliente recebe link: /mesa/{slug}-mesa-whatsapp-delivery/pedido
   - Exemplo: /mesa/meu-restaurante-mesa-whatsapp-delivery/pedido

3. Front-end detecta mesa WhatsApp via useOrderOrigin hook
   - Verifica se mesaId === 'mesa-whatsapp-delivery'
   - Define automaticamente orderOrigin como 'whatsapp'

4. Cliente navega pelo cardápio e adiciona itens

5. Na página de checkout (SacolaPage):
   a) Cliente ESCOLHE o tipo de entrega:
      - 🛵 Delivery (receber em casa)
      - 🏪 Retirada (retirar no local)
   
   b) ClientDataForm é exibido automaticamente:
      - Para DELIVERY: Nome, CPF, Telefone + Endereço completo
      - Para RETIRADA: Nome, CPF, Telefone (sem endereço)
   
   c) Dados são auto-preenchidos do IndexedDB (se existirem)

6. Ao confirmar pedido:
   - Dados são salvos no IndexedDB (para próximos pedidos)
   - Pedido é criado na mesa WhatsApp com:
     * orderOrigin: 'whatsapp'
     * tipoEntrega: 'delivery' ou 'retirada'
     * cliente: { nome, cpf, endereco (se delivery), telefone }
     * formaPagamento: 'dinheiro', 'pix', 'credito', 'debito'

7. Painel do restaurante exibe:
   - Mesa "WhatsApp" com badge (🛵 Delivery ou 🏪 Retirada)
   - Dados do cliente
   - Endereço de entrega (se delivery) ou "Retirar no local" (se retirada)
   - Forma de pagamento
```

## Arquivos Criados/Modificados

### Novos Arquivos

#### Configuração e Hooks
- [`src/config/dexieConfig.js`](c:\Users\Usuario\Documents\MesaFacil\src\config\dexieConfig.js) - Configuração do IndexedDB com Dexie
- [`src/hooks/useOrderOrigin.js`](c:\Users\Usuario\Documents\MesaFacil\src\hooks\useOrderOrigin.js) - Hook para capturar origem da URL
- [`src/hooks/useClientData.js`](c:\Users\Usuario\Documents\MesaFacil\src\hooks\useClientData.js) - Hook para gerenciar dados do cliente no IndexedDB

#### Componentes
- [`src/features/cliente/components/ClientDataForm.jsx`](c:\Users\Usuario\Documents\MesaFacil\src\features\cliente\components\ClientDataForm.jsx) - Formulário de dados do cliente
- [`src/features/cliente/components/ClientDataForm.css`](c:\Users\Usuario\Documents\MesaFacil\src\features\cliente\components\ClientDataForm.css) - Estilos do formulário
- [`src/features/order/components/OrderOriginBadge.jsx`](c:\Users\Usuario\Documents\MesaFacil\src\features\order\components\OrderOriginBadge.jsx) - Badge visual de origem
- [`src/features/order/components/OrderOriginBadge.css`](c:\Users\Usuario\Documents\MesaFacil\src\features\order\components\OrderOriginBadge.css) - Estilos do badge
- [`src/components/WhatsAppLinkGenerator.jsx`](c:\Users\Usuario\Documents\MesaFacil\src\components\WhatsAppLinkGenerator.jsx) - Gerador de link WhatsApp (admin)
- [`src/components/WhatsAppLinkGenerator.css`](c:\Users\Usuario\Documents\MesaFacil\src\components\WhatsAppLinkGenerator.css) - Estilos do gerador

#### Utilitários
- [`src/utils/whatsappMenuLink.js`](c:\Users\Usuario\Documents\MesaFacil\src\utils\whatsappMenuLink.js) - Funções para gerar links WhatsApp

### Arquivos Modificados

- [`src/hooks/useOrderOrigin.js`](c:\Users\Usuario\Documents\MesaFacil\src\hooks\useOrderOrigin.js)
  * Detecta origem pela mesa (`mesaId === 'mesa-whatsapp-delivery'`)
  * Não depende mais de parâmetros URL

- [`src/features/cliente/context/CarrinhoContext.jsx`](c:\Users\Usuario\Documents\MesaFacil\src\features\cliente\context\CarrinhoContext.jsx)
  * Adicionado: `orderOrigin`, `clientData` ao contexto
  * Usa `useOrderOrigin` para detectar origem automaticamente
  
- [`src/features/cliente/pages/SacolaPage.jsx`](c:\Users\Usuario\Documents\MesaFacil\src\features\cliente\pages\SacolaPage.jsx)
  * Integrado: `useOrderOrigin`, `ClientDataForm`
  * Validação de dados do cliente para pedidos WhatsApp
  * Envio de dados extras (`orderOrigin`, `cliente`, `formaPagamento`)

- [`src/features/order/services/orderService.js`](c:\Users\Usuario\Documents\MesaFacil\src\features\order\services\orderService.js)
  * `createPedido()` aceita parâmetro `extraData`
  * Persiste `orderOrigin`, `cliente`, `formaPagamento` no Firestore

- [`src/features/order/components/TableCard.jsx`](c:\Users\Usuario\Documents\MesaFacil\src\features\order\components\TableCard.jsx)
  * Exibe `OrderOriginBadge` nos cartões de mesa

- [`src/features/order/components/modals/DetailOrderModal.jsx`](c:\Users\Usuario\Documents\MesaFacil\src\features\order\components\modals\DetailOrderModal.jsx)
  * Exibe dados do cliente para pedidos WhatsApp
  * Exibe `OrderOriginBadge` por pedido

- [`src/utils/whatsappMenuLink.js`](c:\Users\Usuario\Documents\MesaFacil\src\utils\whatsappMenuLink.js)
  * Atualizado para gerar links da mesa virtual WhatsApp
  * Exporta `WHATSAPP_TABLE_ID` constante

- [`src/components/WhatsAppLinkGenerator.jsx`](c:\Users\Usuario\Documents\MesaFacil\src\components\WhatsAppLinkGenerator.jsx)
  * Usa `generateWhatsAppTableLink` para links da mesa virtual

- [`functions/ifood-polling.js`](c:\Users\Usuario\Documents\MesaFacil\functions\ifood-polling.js)
  * Adiciona `orderOrigin: 'ifood'` aos pedidos iFood

### Novos Arquivos de Configuração

- [`src/features/config/components/modals/WhatsAppConfigModal.jsx`](c:\Users\Usuario\Documents\MesaFacil\src\features\config\components\modals\WhatsAppConfigModal.jsx)
  * Modal de configuração do WhatsApp
  * Toggle para ativar/desativar
  * Cria mesa virtual automaticamente

- [`src/features/config/services/whatsappService.js`](c:\Users\Usuario\Documents\MesaFacil\src\features\config\services\whatsappService.js)
  * Serviço para gerenciar configurações WhatsApp
  * Criar/verificar mesa virtual
  * Persistir configurações no Firestore

## IndexedDB - Schema

```javascript
Database: mesaFacilDB
Store: clientes

Schema:
{
  id: number,      // 1 (single-user device)
  nome: string,    // Nome completo
  cpf: string,     // CPF (apenas números)
  endereco: string,// Endereço completo
  telefone: string // Telefone (apenas números)
}
```

### Privacidade e Segurança
- ✅ Dados armazenados **localmente** no dispositivo do cliente
- ✅ Não armazenamos dados de cartão
- ✅ Auto-preenchimento apenas para o dispositivo atual
- ✅ Cliente pode limpar dados do navegador a qualquer momento

## Firestore - Estrutura de Pedido

```javascript
restaurantes/{idRestaurante}/mesas/{mesaId}/pedidos/{pedidoId}
{
  items: [...],
  total: number,
  observacoes: string,
  status: string,
  criadoEm: timestamp,
  
  // Campos de origem
  orderOrigin: 'whatsapp' | 'ifood' | 'mesaconvencional',
  
  // Tipo de entrega (apenas para WhatsApp)
  tipoEntrega: 'delivery' | 'retirada',
  
  // Dados do cliente (apenas para WhatsApp)
  cliente: {
    nome: string,
    cpf: string,
    endereco: string,           // Vazio para retirada
    enderecoDetalhado: object,  // Null para retirada
    telefone: string
  },
  
  // Forma de pagamento
  formaPagamento: 'dinheiro' | 'pix' | 'credito' | 'debito',
  
  // Dados de troco (apenas para dinheiro)
  troco: {
    precisaTroco: boolean,
    valorPagamento: number,
    valorTroco: number
  } | null
}
```

## Uso - Cliente (Front-end)

### 1. Acessar Cardápio via WhatsApp

```
https://seu-dominio.com/mesa/seu-restaurante-mesa-whatsapp-delivery/pedido
```

**Formato**: `/mesa/{slug}-mesa-whatsapp-delivery/pedido`

O ID da mesa (`mesa-whatsapp-delivery`) é fixo e identifica automaticamente que é um pedido WhatsApp.

### 2. Hook useOrderOrigin

O hook agora detecta a origem pela mesa, não por parâmetros URL:

```jsx
import { useOrderOrigin } from '@/hooks/useOrderOrigin';

function MeuComponente() {
  const { origin, isWhatsApp, isIfood, isMesaConvencional } = useOrderOrigin();
  
  // origin será 'whatsapp' automaticamente quando mesaId === 'mesa-whatsapp-delivery'
  
  return (
    <div>
      {isWhatsApp && <p>Pedido delivery via WhatsApp</p>}
    </div>
  );
}
```

**Detecção automática**: O hook usa `useCliente()` para obter o `mesaId` e verifica se é igual a `'mesa-whatsapp-delivery'`.

### 3. Formulário de Dados do Cliente

```jsx
import ClientDataForm from '@/features/cliente/components/ClientDataForm';

function Checkout() {
  const handleDataChange = (data, isValid) => {
    console.log('Dados do cliente:', data);
    console.log('Formulário válido:', isValid);
  };

  return (
    <ClientDataForm 
      onDataChange={handleDataChange}
      isRequired={true}
    />
  );
}
```

## Uso - Restaurante (Admin)

### 1. Ativar WhatsApp Delivery

No painel administrativo:

1. Clique em **Configurações** no Header
2. Selecione **📬 Pedidos WhatsApp**
3. Ative o toggle "Ativar pedidos via WhatsApp"
4. O sistema criará automaticamente a mesa virtual `mesa-whatsapp-delivery`
5. Copie o link gerado para compartilhar com clientes

### 2. Gerador de Link WhatsApp

O componente está integrado no modal de configuração:

```jsx
import WhatsAppLinkGenerator from '@/components/WhatsAppLinkGenerator';

function ConfigPage() {
  return (
    <div>
      <h2>Compartilhamento WhatsApp</h2>
      <WhatsAppLinkGenerator restaurantSlug="meu-restaurante" />
    </div>
  );
}
```

O link gerado terá o formato: `/mesa/meu-restaurante-mesa-whatsapp-delivery/pedido`

### 2. Visualizar Origem no Painel

```jsx
import OrderOriginBadge from '@/features/order/components/OrderOriginBadge';

function PedidoCard({ pedido }) {
  return (
    <div>
      <h3>Pedido #{pedido.id}</h3>
      <OrderOriginBadge origin={pedido.orderOrigin} size="medium" />
    </div>
  );
}
```

### 3. Exibir Dados do Cliente

No `DetailOrderModal`, os dados são exibidos automaticamente quando `pedido.orderOrigin === 'whatsapp'`:

- Nome do cliente
- Telefone
- Endereço de entrega
- Forma de pagamento

## Utilitários JavaScript

### Gerar Link da Mesa WhatsApp

```javascript
import { 
  generateWhatsAppTableLink,
  WHATSAPP_TABLE_ID,
  generateWhatsAppMessage,
  copyWhatsAppLinkToClipboard 
} from '@/utils/whatsappMenuLink';

// Gerar link da mesa WhatsApp
const link = generateWhatsAppTableLink('meu-restaurante');
// Output: https://seu-dominio.com/mesa/meu-restaurante-mesa-whatsapp-delivery/pedido

// ID fixo da mesa WhatsApp
console.log(WHATSAPP_TABLE_ID); // 'mesa-whatsapp-delivery'

// Copiar para clipboard
await copyWhatsAppLinkToClipboard(link);

// Gerar mensagem formatada para WhatsApp
const message = generateWhatsAppMessage(link, 'Meu Restaurante');
```

**Nota**: `generateWhatsAppMenuLink` ainda existe por compatibilidade mas é deprecated. Use `generateWhatsAppTableLink`.

## Badges Visuais

### Cores por Origem e Tipo de Entrega

| Origem | Tipo | Cor | Ícone |
|--------|------|-----|-------|
| WhatsApp | Delivery | Verde (#22C55E) | 🛵 |
| WhatsApp | Retirada | Azul (#3B82F6) | 🏪 |
| iFood | - | Vermelho (#EA1D2C) | 🍔 |
| Mesa Convencional | - | Cinza (#6c757d) | 🍽️ |

## Validações

### ClientDataForm

#### Para Delivery (todos obrigatórios):
- **Nome**: mínimo 3 caracteres
- **CPF**: 11 dígitos (formato: 000.000.000-00)
- **Telefone**: mínimo 10 dígitos (formato: (00) 00000-0000)
- **Rua**: mínimo 3 caracteres
- **Número**: obrigatório
- **Bairro**: mínimo 2 caracteres
- **Cidade**: mínimo 2 caracteres

#### Para Retirada (sem endereço):
- **Nome**: mínimo 3 caracteres
- **CPF**: 11 dígitos (formato: 000.000.000-00)
- **Telefone**: mínimo 10 dígitos (formato: (00) 00000-0000)

Formatação automática aplicada durante digitação.

## Testes

### Testar Configuração WhatsApp

1. Faça login no painel admin
2. Vá em **Configurações** → **📬 Pedidos WhatsApp**
3. Ative o toggle
4. Verifique se a mesa virtual foi criada no Firestore:
   - Caminho: `restaurantes/{id}/mesas/mesa-whatsapp-delivery`
   - Propriedades: `isVirtual: true`, `isWhatsApp: true`
5. Copie o link gerado

### Testar Fluxo de Pedido WhatsApp

#### Testar Delivery:
1. Acesse o link copiado: `http://localhost:3000/mesa/seu-slug-mesa-whatsapp-delivery/pedido`
2. Adicione itens ao carrinho
3. Vá para a sacola
4. Selecione **"🛵 Delivery"**
5. Verifique se o formulário de dados do cliente aparece COM campos de endereço
6. Preencha: nome, CPF, telefone, rua, número, bairro, cidade
7. Escolha forma de pagamento
8. Confirme o pedido
9. Verifique no painel admin:
   - Badge "🛵 Delivery" verde aparece no pedido
   - Endereço de entrega é exibido

#### Testar Retirada:
1. Acesse o link copiado: `http://localhost:3000/mesa/seu-slug-mesa-whatsapp-delivery/pedido`
2. Adicione itens ao carrinho
3. Vá para a sacola
4. Selecione **"🏪 Retirada"**
5. Verifique se o formulário de dados do cliente aparece SEM campos de endereço
6. Preencha: nome, CPF, telefone
7. Escolha forma de pagamento
8. Confirme o pedido
9. Verifique no painel admin:
   - Badge "🏪 Retirada" azul aparece no pedido
   - Mensagem "Cliente retirará no local" é exibida

### Testar IndexedDB

```javascript
// Console do navegador
import { getClienteData, saveClienteData } from '@/config/dexieConfig';

// Salvar
await saveClienteData({
  nome: 'João Silva',
  cpf: '12345678900',
  endereco: 'Rua Teste, 123',
  telefone: '11999999999'
});

// Recuperar
const data = await getClienteData();
console.log(data);
```

### Testar Detecção de Origem

```javascript
// No componente cliente, dentro da mesa WhatsApp
import { useOrderOrigin } from '@/hooks/useOrderOrigin';

const { origin, isWhatsApp } = useOrderOrigin();
console.log(origin); // 'whatsapp'
console.log(isWhatsApp); // true
```

## Troubleshooting

### Mesa WhatsApp não foi criada

**Problema**: Mesa virtual não aparece após ativar

**Solução**:
- Verifique o console por erros
- Verifique permissões do Firestore
- Tente desativar e ativar novamente
- Verifique em Firestore: `restaurantes/{id}/mesas/mesa-whatsapp-delivery`

### Link não detecta origem WhatsApp

**Problema**: `orderOrigin` permanece como `mesaconvencional`

**Solução**:
- Verifique se a URL contém o ID correto: `mesa-whatsapp-delivery`
- Formato correto: `/mesa/{slug}-mesa-whatsapp-delivery/pedido`
- Verifique `sessionStorage.getItem('orderOrigin')` no console
- Verifique se `useCliente()` retorna o `mesaId` correto
- Limpe sessionStorage e recarregue: `sessionStorage.clear()`

### Formulário de dados não aparece

**Problema**: ClientDataForm não é exibido no checkout

**Solução**:
- Verifique se `isWhatsApp` é `true` no SacolaPage
- Console: importe e use `useOrderOrigin()` para verificar
- Certifique-se de estar acessando pela mesa WhatsApp

### Dados não salvam no IndexedDB

**Problema**: Dados não persistem entre sessões

**Solução**:
- Verifique se Dexie está instalado: `bun add dexie`
- Verifique console do navegador por erros
- Verifique Application > IndexedDB > mesaFacilDB
- Tente em modo anônimo para descartar extensões

### Badge não aparece no painel

**Problema**: Badge de origem não é exibido

**Solução**:
- Verifique se `orderOrigin` está no documento do pedido no Firestore
- Verifique se o componente `OrderOriginBadge` está importado
- Force refresh do painel de pedidos
- Verifique se o pedido foi feito na mesa WhatsApp

### Erro ao criar pedido

**Problema**: Pedido não é criado na mesa WhatsApp

**Solução**:
- Verifique se a mesa existe no Firestore
- Verifique console por erros de permissão
- Confirme que `orderOrigin` está sendo enviado corretamente
- Verifique se dados do cliente estão válidos

## Benefícios da Mesa Virtual

### Vantagens da Abordagem Atual

1. **Simplicidade**: Não depende de parâmetros URL, apenas do ID da mesa
2. **Confiabilidade**: ID fixo (`mesa-whatsapp-delivery`) garante consistência
3. **Segurança**: Origem não pode ser manipulada pelo cliente
4. **Rastreabilidade**: Todos os pedidos WhatsApp ficam agrupados em uma mesa
5. **Facilidade**: Um único link para compartilhar com todos os clientes
6. **Compatibilidade**: Sistema funciona como mesas normais, sem código especial
7. **Escalabilidade**: Pode ser estendido para outras integrações (Telegram, etc.)

### Centralização de Pedidos

Todos os pedidos delivery via WhatsApp ficam na mesma mesa virtual:
- Facilita visualização no painel
- Simplifica relatórios de delivery
- Permite configurações específicas para WhatsApp
- Badge visual destaca origem automaticamente

## Próximos Passos

- [ ] Adicionar validação de CPF completa (verificar dígitos)
- [ ] Implementar histórico de endereços múltiplos
- [ ] Adicionar opções de pagamento (PIX, cartão online)
- [ ] Criar relatório de pedidos por origem
- [ ] Implementar notificações WhatsApp automáticas (webhook)
- [ ] Adicionar tracking de entrega em tempo real
- [ ] Sistema de cupons de desconto para delivery
- [ ] Taxa de entrega por região/distância

## Arquitetura Técnica

### Fluxo de Dados

```
Cliente → URL com mesa-whatsapp-delivery
    ↓
useOrderOrigin (detecta mesa)
    ↓
CarrinhoContext (seta origin)
    ↓
SacolaPage (exibe formulário)
    ↓
IndexedDB (salva dados cliente)
    ↓
orderService (cria pedido com tipoEntrega)
    ↓
Firestore (persiste com origin + tipoEntrega)
    ↓
Painel Admin (exibe badge Delivery/Retirada)
```

### Componentes Chave

1. **Detecção**: `useOrderOrigin` + `useCliente`
2. **Storage**: IndexedDB via Dexie
3. **UI**: `ClientDataForm` (com prop `isRetirada`) + `OrderOriginBadge` (com prop `tipoEntrega`)
4. **Backend**: `orderService` + `whatsappService`
5. **Config**: `WhatsAppConfigModal` no Header

## Referências

- [Dexie.js Documentation](https://dexie.org/)
- [WhatsApp API Links](https://faq.whatsapp.com/5913398998672934)
- [IndexedDB MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [React Context API](https://react.dev/reference/react/useContext)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)

---

**Versão**: 2.1.0  
**Data**: 2026-01-13  
**Mudanças**: Adicionada funcionalidade de Retirada no cardápio WhatsApp  
**Autor**: GitHub Copilot

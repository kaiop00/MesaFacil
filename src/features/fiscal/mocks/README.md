# Guia de Mocks de NFC-e

Este guia descreve como usar os mocks de NFC-e para desenvolvimento e testes do frontend.

## Arquivo de Mocks

**Localização**: `src/features/fiscal/mocks/nfceMocks.js`

Contém exemplos realistas de NFC-es em diferentes estados de processamento.

## Estados de NFC-e Disponíveis

### 1. **Autorizado** (`autorizado`)
- Status: ✅ Autorizado
- Documentos: Completos (DANFE, XML, PDF)
- Uso: Testar visualização de notas completas
- Exemplo: `NFCE_MOCKS.autorizado`

### 2. **Pendente** (`pendente`)
- Status: ⏳ Enviada mas aguardando resposta
- Documentos: Vazios
- Uso: Testar UI enquanto NFC-e está sendo processada
- Exemplo: `NFCE_MOCKS.pendente`

### 3. **Processando** (`processando`)
- Status: 🔄 Em processamento na Sefaz
- Documentos: Vazios, sem protocolo
- Uso: Testar estado de carregamento
- Exemplo: `NFCE_MOCKS.processando`

### 4. **Rejeitado** (`rejeitado`)
- Status: ❌ Recusado pela Sefaz
- Documentos: Razão do erro
- Uso: Testar tratamento de erros e exibição de motivos
- Exemplo: `NFCE_MOCKS.rejeitado`

### 5. **Cancelado** (`cancelado`)
- Status: 🚫 Cancelado após autorização
- Documentos: Disponíveis (inclui XML de cancelamento)
- Uso: Testar NFC-es canceladas com histórico completo
- Exemplo: `NFCE_MOCKS.cancelado`

### 6. **Complementar** (`complementar`)
- Tipo: Nota complementar referenciando NFC-e anterior
- Status: ✅ Autorizado
- Uso: Testar fluxo de adição de itens após emissão
- Exemplo: `NFCE_MOCKS.complementar`

## Funções Disponíveis

### `getMockNfceList(limit, skip)`
Retorna lista paginada de NFC-es mock (expande automaticamente os dados para criar mais registros).

**Parâmetros:**
- `limit` (number): Itens por página (padrão: 10)
- `skip` (number): Itens a pular (padrão: 0)

**Retorno:**
```javascript
{
  nfces: Array,
  total: number
}
```

**Exemplo:**
```javascript
import { getMockNfceList } from '@/features/fiscal/mocks/nfceMocks';

const { nfces, total } = getMockNfceList(50, 0);
```

### `getMockNfceById(id)`
Retorna um NFC-e mock específico por ID.

**Parâmetros:**
- `id` (string): ID da NFC-e

**Retorno:** NFC-e object ou null

**Exemplo:**
```javascript
import { getMockNfceById } from '@/features/fiscal/mocks/nfceMocks';

const nfce = getMockNfceById('nfce_001_autorizado_20240320');
```

### `getMockNfceByStatus(status)`
Filtra NFC-es por status.

**Parâmetros:**
- `status` (string): Status para filtrar (`autorizado`, `pendente`, `rejeitado`, etc.)

**Retorno:** Array de NFC-es

**Exemplo:**
```javascript
import { getMockNfceByStatus } from '@/features/fiscal/mocks/nfceMocks';

const autorizadas = getMockNfceByStatus('autorizado');
```

### `simulateSyncNfceDocuments(id)`
Simula sincronização de documentos de uma NFC-e (transição de status).

**Parâmetros:**
- `id` (string): ID da NFC-e

**Retorno:** Objeto com NFC-e atualizada e documentos

**Exemplo:**
```javascript
import { simulateSyncNfceDocuments } from '@/features/fiscal/mocks/nfceMocks';

const result = simulateSyncNfceDocuments('nfce_002_pendente_20240320');
// Se estava "pendente", transiciona para "autorizado" ou "rejeitado"
```

### `simulateCancelNfce(id, justificativa)`
Simula cancelamento de uma NFC-e.

**Parâmetros:**
- `id` (string): ID da NFC-e
- `justificativa` (string): Motivo do cancelamento

**Retorno:** NFC-e cancelada

**Exemplo:**
```javascript
import { simulateCancelNfce } from '@/features/fiscal/mocks/nfceMocks';

const cancelada = simulateCancelNfce('nfce_001_autorizado_20240320', 'Pedido cancelado por cliente');
```

## Estrutura de Dados de NFC-e

```javascript
{
  // Identificação
  id: "nfce_001_autorizado_20240320",       // ID único no sistema
  numero: 123001,                            // Número sequencial da NFC-e
  chave: "35240320123456...",               // Chave de acesso de 44 dígitos
  protocolo: "135240320...",                // Protocolo de autorização

  // Valores
  vNF: 156.50,                              // Valor da NFC-e (campo padrão Sefaz)
  valor: 156.50,                            // Valor redundante para compatibilidade
  
  // Status e datas
  status: "autorizado",                     // Estado atual
  criado_em: "2024-03-20T14:30:00.000Z",   // Data/hora de criação
  data: "2024-03-20T14:30:00.000Z",        // Redundância

  // Referências
  numero_pedido: "PED-2024-001",            // ID do pedido no sistema
  mesa: "Mesa 5",                           // Identificação da mesa
  
  // Cliente
  cliente: {
    nome: "Cliente 1",
    email: "cliente1@email.com",
    telefone: "(11) 98765-4321",
  },

  // Itens
  itens: [
    {
      id: "item_1",
      descricao: "Prato executivo",
      quantidade: 2,
      valor_unitario: 35.00,
      valor_total: 70.00,
    },
    // ...
  ],

  // Documentos disponíveis
  documentos: {
    status: "completo",                     // Pode ser: "completo", "pendente", "erro", "cancelado", "processando"
    chaveAcesso: "35240320123456...",
    danfceUrl: "https://...",               // DANFE em PDF
    xmlUrl: "https://...",                  // XML da NFC-e
    pdfUrl: "https://...",                  // Representação em PDF
    qrCode: "https://...",                  // QR Code
    cancelamentoUrl: "https://...",         // (Se cancelada) XML do cancelamento
  },

  // Shortcuts (para compatibilidade)
  url_danfce: "https://...",
  url_xml: "https://...",
  url_pdf: "https://...",

  // Campos opcionais
  tipo: "complementar",                     // Se for nota complementar
  referencia_nfce: "35240319123456...",    // Referência a NFC-e anterior
  cancelado_em: "2024-03-19T14:00:00.000Z",
  motivo_cancelamento: "Pedido cancelado por cliente",
  erro: {                                   // Se rejeitada
    codigo: "302",
    mensagem: "Falha na validação: Série inválida",
  },
}
```

## Casos de Uso no Desenvolvimento

### 1. Testar Página de Listagem
Para testar com paginação real:

```javascript
// Em NfceListPage.jsx
const mockData = await getMockNfceList(50, currentPage * 50);
setNfces(mockData.nfces);
setTotal(mockData.total);
```

### 2. Testar Visualização de Detalhes
Para testar modal de detalhes:

```javascript
// Em componente
const selectedNfce = getMockNfceById('nfce_001_autorizado_20240320');
setSelectedNfce(selectedNfce);
setShowDetailsModal(true);
```

### 3. Testar Sincronização de Documentos
Para simular resposta da Sefaz:

```javascript
// Em handleSyncDocuments
const result = simulateSyncNfceDocuments(selectedNfce.id);
setSelectedNfce((prev) => ({
  ...prev,
  status: result.nfces.status,
  chave: result.documentos.chaveAcesso,
  // ... atualizar outros campos
}));
```

### 4. Testar Cancelamento
Para simular cancelamento:

```javascript
// Em handleCancelNfce
const cancelada = simulateCancelNfce(selectedNfce.id, justificativa);
setSelectedNfce(cancelada);
```

### 5. Testar Diferentes Estados na Mesma Tela
Para comparar UI em diferentes estados:

```javascript
// Componentes side-by-side
const estados = [
  NFCE_MOCKS.autorizado,
  NFCE_MOCKS.pendente,
  NFCE_MOCKS.rejeitado,
  NFCE_MOCKS.cancelado,
];

return (
  <div className="grid grid-cols-2 gap-4">
    {estados.map((nfce) => (
      <NfceTable key={nfce.id} nfces={[nfce]} onViewDetails={...} />
    ))}
  </div>
);
```

## Estrutura de Diretórios

```
src/features/fiscal/
├── components/
│   └── NfceTable.jsx          // Tabela de exibição
├── pages/
│   ├── NfceListPage.jsx       // Listagem com paginação
│   └── ConfigFiscalPage.jsx   // Configuração
├── mocks/
│   └── nfceMocks.js           // ← VOCÊ ESTÁ AQUI
├── services/
│   ├── nfceListService.js     // Chamadas à API
│   ├── nfceService.js
│   └── configFiscalService.js
```

## Próximos Passos

1. **Conectar mocks via serviços**: Você pode importar os mocks em `nfceListService.js` para uso em desenvolvimento com flag de ambiente
2. **Criar página de testes**: Componente que demonstra todos os estados
3. **Adicionar mais variações**: Expandir mocks com casos edge (valores muito altos, produtos especiais, etc.)
4. **Integrar com componentes**: Usar em histórias Storybook ou testes de componentes

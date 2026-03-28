/**
 * Mocks de NFC-e para testes e desenvolvimento
 * Simula dados reais de notas fiscais eletrônicas em diferentes estados
 */

export const NFCE_MOCKS = {
  // NFC-e autorizado com todos os documentos disponíveis
  autorizado: {
    id: "nfce_001_autorizado_20240320",
    numero: 123001,
    chave: "35240320123456789012345678901234567890123456",
    protocolo: "135240320123456789012345678",
    vNF: 156.50,
    valor: 156.50,
    status: "autorizado",
    criado_em: new Date("2024-03-20T14:30:00").toISOString(),
    data: new Date("2024-03-20T14:30:00").toISOString(),
    numero_pedido: "PED-2024-001",
    mesa: "Mesa 5",
    cliente: {
      nome: "Cliente 1",
      email: "cliente1@email.com",
      telefone: "(11) 98765-4321",
    },
    itens: [
      {
        id: "item_1",
        descricao: "Prato executivo",
        quantidade: 2,
        valor_unitario: 35.00,
        valor_total: 70.00,
      },
      {
        id: "item_2",
        descricao: "Refrigerante 2L",
        quantidade: 1,
        valor_unitario: 12.50,
        valor_total: 12.50,
      },
      {
        id: "item_3",
        descricao: "Sobremesa",
        quantidade: 2,
        valor_unitario: 20.00,
        valor_total: 40.00,
      },
    ],
    documentos: {
      status: "completo",
      chaveAcesso: "35240320123456789012345678901234567890123456",
      danfceUrl: "https://example.com/danfce/123001.pdf",
      xmlUrl: "https://example.com/xml/123001.xml",
      pdfUrl: "https://example.com/pdf/123001.pdf",
      qrCode: "https://example.com/qrcode/123001.png",
    },
    url_danfce: "https://example.com/danfce/123001.pdf",
    url_xml: "https://example.com/xml/123001.xml",
    url_pdf: "https://example.com/pdf/123001.pdf",
  },

  // NFC-e pendente (enviada mas ainda não autorizada)
  pendente: {
    id: "nfce_002_pendente_20240320",
    numero: 123002,
    chave: "35240320123456789012345678901234567890123447",
    protocolo: null,
    vNF: 89.90,
    valor: 89.90,
    status: "pendente",
    criado_em: new Date("2024-03-20T15:45:00").toISOString(),
    data: new Date("2024-03-20T15:45:00").toISOString(),
    numero_pedido: "PED-2024-002",
    mesa: "Mesa 8",
    cliente: {
      nome: "Cliente 2",
      email: "cliente2@email.com",
      telefone: "(11) 99876-5432",
    },
    itens: [
      {
        id: "item_4",
        descricao: "Moqueca",
        quantidade: 1,
        valor_unitario: 58.00,
        valor_total: 58.00,
      },
      {
        id: "item_5",
        descricao: "Chopp 600ml",
        quantidade: 2,
        valor_unitario: 15.95,
        valor_total: 31.90,
      },
    ],
    documentos: {
      status: "pendente",
      chaveAcesso: null,
      danfceUrl: null,
      xmlUrl: null,
      pdfUrl: null,
    },
    url_danfce: null,
    url_xml: null,
    url_pdf: null,
  },

  // NFC-e processando
  processando: {
    id: "nfce_003_processando_20240320",
    numero: 123003,
    chave: null,
    protocolo: null,
    vNF: 245.30,
    valor: 245.30,
    status: "processando",
    criado_em: new Date("2024-03-20T16:20:00").toISOString(),
    data: new Date("2024-03-20T16:20:00").toISOString(),
    numero_pedido: "PED-2024-003",
    mesa: "Mesa 12",
    cliente: {
      nome: "Cliente 3",
      email: null,
      telefone: null,
    },
    itens: [
      {
        id: "item_6",
        descricao: "Rodízio completo",
        quantidade: 4,
        valor_unitario: 59.90,
        valor_total: 239.60,
      },
      {
        id: "item_7",
        descricao: "Água com gás",
        quantidade: 1,
        valor_unitario: 5.70,
        valor_total: 5.70,
      },
    ],
    documentos: {
      status: "processando",
      chaveAcesso: null,
      danfceUrl: null,
      xmlUrl: null,
      pdfUrl: null,
    },
    url_danfce: null,
    url_xml: null,
    url_pdf: null,
  },

  // NFC-e rejeitada
  rejeitado: {
    id: "nfce_004_rejeitado_20240320",
    numero: 123004,
    chave: null,
    protocolo: "135240320123456789012345679",
    vNF: 78.50,
    valor: 78.50,
    status: "rejeitado",
    criado_em: new Date("2024-03-20T12:00:00").toISOString(),
    data: new Date("2024-03-20T12:00:00").toISOString(),
    numero_pedido: "PED-2024-004",
    mesa: "Mesa 2",
    cliente: {
      nome: "Cliente 4",
      email: "cliente4@email.com",
      telefone: "(21) 98765-4321",
    },
    erro: {
      codigo: "302",
      mensagem: "Falha na validação: Série inválida para este ambiente",
    },
    itens: [
      {
        id: "item_8",
        descricao: "Sushi combinado",
        quantidade: 1,
        valor_unitario: 78.50,
        valor_total: 78.50,
      },
    ],
    documentos: {
      status: "erro",
      chaveAcesso: null,
      danfceUrl: null,
      xmlUrl: null,
      pdfUrl: null,
      erro: "Falha na validação: Série inválida",
    },
    url_danfce: null,
    url_xml: null,
    url_pdf: null,
  },

  // NFC-e cancelada
  cancelado: {
    id: "nfce_005_cancelado_20240319",
    numero: 123005,
    chave: "35240319123456789012345678901234567890123458",
    protocolo: "135240319123456789012345671",
    vNF: 125.00,
    valor: 125.00,
    status: "cancelado",
    criado_em: new Date("2024-03-19T13:15:00").toISOString(),
    data: new Date("2024-03-19T13:15:00").toISOString(),
    cancelado_em: new Date("2024-03-19T14:00:00").toISOString(),
    numero_pedido: "PED-2024-005",
    mesa: "Mesa 3",
    cliente: {
      nome: "Cliente 5",
      email: "cliente5@email.com",
      telefone: "(85) 98765-4321",
    },
    motivo_cancelamento: "Pedido cancelado por solicitação do cliente",
    itens: [
      {
        id: "item_9",
        descricao: "Hambúrguer gourmet",
        quantidade: 3,
        valor_unitario: 42.00,
        valor_total: 126.00,
      },
    ],
    documentos: {
      status: "cancelado",
      chaveAcesso: "35240319123456789012345678901234567890123458",
      danfceUrl: "https://example.com/danfce/123005.pdf",
      xmlUrl: "https://example.com/xml/123005.xml",
      pdfUrl: "https://example.com/pdf/123005.pdf",
      cancelamentoUrl: "https://example.com/cancelamento/123005.xml",
    },
    url_danfce: "https://example.com/danfce/123005.pdf",
    url_xml: "https://example.com/xml/123005.xml",
    url_pdf: "https://example.com/pdf/123005.pdf",
  },

  // NFC-e com nota complementar
  complementar: {
    id: "nfce_006_complementar_20240320",
    numero: 123006,
    chave: "35240320123456789012345678901234567890123459",
    protocolo: "135240320123456789012345672",
    vNF: 45.00,
    valor: 45.00,
    status: "autorizado",
    tipo: "complementar",
    referencia_nfce: "35240319123456789012345678901234567890123458", // referencia a NFC-e anterior
    criado_em: new Date("2024-03-20T17:30:00").toISOString(),
    data: new Date("2024-03-20T17:30:00").toISOString(),
    numero_pedido: "PED-2024-005-ADIÇÃO",
    mesa: "Mesa 3",
    cliente: {
      nome: "Cliente 5",
      email: "cliente5@email.com",
      telefone: "(85) 98765-4321",
    },
    motivo: "Adição de itens ao pedido anterior",
    itens: [
      {
        id: "item_10",
        descricao: "Batata frita adicional",
        quantidade: 2,
        valor_unitario: 22.50,
        valor_total: 45.00,
      },
    ],
    documentos: {
      status: "completo",
      chaveAcesso: "35240320123456789012345678901234567890123459",
      danfceUrl: "https://example.com/danfce/123006.pdf",
      xmlUrl: "https://example.com/xml/123006.xml",
      pdfUrl: "https://example.com/pdf/123006.pdf",
    },
    url_danfce: "https://example.com/danfce/123006.pdf",
    url_xml: "https://example.com/xml/123006.xml",
    url_pdf: "https://example.com/pdf/123006.pdf",
  },
};

/**
 * Retorna uma lista paginada de NFC-es mock
 * @param {number} limit - Quantidade de itens por página
 * @param {number} skip - Quantidade de itens a pular
 * @returns {Object} { nfces: Array, total: number }
 */
export function getMockNfceList(limit = 10, skip = 0) {
  const allNfces = Object.values(NFCE_MOCKS);
  
  // Criar mais mocks duplicando e variando os dados
  const expandedList = [
    ...allNfces,
    ...allNfces.map((nfce, idx) => ({
      ...nfce,
      id: `${nfce.id}_copy${idx + 1}`,
      numero: nfce.numero + (idx + 1) * 100,
      chave: nfce.chave ? `${nfce.chave.slice(0, -4)}${String((parseInt(nfce.chave.slice(-4)) + idx + 1)).padStart(4, "0")}` : null,
      criado_em: new Date(new Date(nfce.criado_em).getTime() + (idx + 1) * 3600000).toISOString(),
      data: new Date(new Date(nfce.data).getTime() + (idx + 1) * 3600000).toISOString(),
    })),
  ];

  const total = expandedList.length;
  const paginatedList = expandedList.slice(skip, skip + limit);

  return {
    nfces: paginatedList,
    total,
  };
}

/**
 * Retorna um único NFC-e mock por ID
 * @param {string} id - ID da NFC-e
 * @returns {Object|null}
 */
export function getMockNfceById(id) {
  const nfce = Object.values(NFCE_MOCKS).find((n) => n.id === id);
  return nfce || null;
}

/**
 * Retorna NFC-es mock filtrados por status
 * @param {string} status - Status para filtrar
 * @returns {Array}
 */
export function getMockNfceByStatus(status) {
  return Object.values(NFCE_MOCKS).filter((nfce) => nfce.status === status);
}

/**
 * Simula sincronização de documentos de uma NFC-e
 * @param {string} id - ID da NFC-e
 * @returns {Object} Documentos sincronizados
 */
export function simulateSyncNfceDocuments(id) {
  const nfce = getMockNfceById(id);
  if (!nfce) return null;

  // Simula transição de status
  let updatedNfce = { ...nfce };
  
  if (nfce.status === "pendente" || nfce.status === "processando") {
    // Simula autorização
    updatedNfce.status = Math.random() > 0.3 ? "autorizado" : "rejeitado";
    
    if (updatedNfce.status === "autorizado") {
      // Gera documentos
      const chaveBase = "35" + new Date().toISOString().slice(2, 8).replace(/-/g, "");
      const chaveCompleta = chaveBase + Math.random().toString().slice(2, 36).padEnd(20, "0");
      updatedNfce = {
        ...updatedNfce,
        protocolo: `1${chaveCompleta.slice(-27)}`,
        chave: chaveCompleta,
        documentos: {
          status: "completo",
          chaveAcesso: chaveCompleta,
          danfceUrl: `https://example.com/danfce/${nfce.numero}.pdf`,
          xmlUrl: `https://example.com/xml/${nfce.numero}.xml`,
          pdfUrl: `https://example.com/pdf/${nfce.numero}.pdf`,
          qrCode: `https://example.com/qrcode/${nfce.numero}.png`,
        },
        url_danfce: `https://example.com/danfce/${nfce.numero}.pdf`,
        url_xml: `https://example.com/xml/${nfce.numero}.xml`,
        url_pdf: `https://example.com/pdf/${nfce.numero}.pdf`,
      };
    } else {
      // Rejeição
      updatedNfce.erro = {
        codigo: "302",
        mensagem: "Falha na validação",
      };
      updatedNfce.documentos = {
        status: "erro",
        erro: "Falha na validação",
      };
    }
  }

  return {
    nfces: updatedNfce,
    documentos: updatedNfce.documentos,
  };
}

/**
 * Simula cancelamento de uma NFC-e
 * @param {string} id - ID da NFC-e
 * @param {string} justificativa - Justificativa do cancelamento
 * @returns {Object} NFC-e cancelada
 */
export function simulateCancelNfce(id, justificativa) {
  const nfce = getMockNfceById(id);
  if (!nfce) return null;

  return {
    ...nfce,
    status: "cancelado",
    cancelado_em: new Date().toISOString(),
    motivo_cancelamento: justificativa,
    documentos: {
      ...nfce.documentos,
      status: "cancelado",
      cancelamentoUrl: `https://example.com/cancelamento/${nfce.numero}.xml`,
    },
  };
}

export default NFCE_MOCKS;

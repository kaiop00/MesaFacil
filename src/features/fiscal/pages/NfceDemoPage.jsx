import { useState } from "react";
import CardHeader from "@/components/CardHeader";
import NfceTable from "@/features/fiscal/components/NfceTable";
import NfceModal from "@/features/order/components/modals/NfceModal";
import { visualizarPreviaDanfce } from "@/features/fiscal/services/nfceService";
import { useAuth } from "@/contexts/AuthContext";
import {
  NFCE_MOCKS,
  getMockNfceList,
  getMockNfceByStatus,
  simulateSyncNfceDocuments,
  simulateCancelNfce,
} from "@/features/fiscal/mocks/nfceMocks";
import { ChevronDown, ChevronUp } from "react-coolicons";

const DEMO_STATES = [
  {
    status: "autorizado",
    label: "Autorizado",
    sectionClass: "bg-emerald-50 hover:bg-emerald-100",
    dotClass: "bg-emerald-500",
  },
  {
    status: "pendente",
    label: "Pendente",
    sectionClass: "bg-amber-50 hover:bg-amber-100",
    dotClass: "bg-amber-500",
  },
  {
    status: "processando",
    label: "Processando",
    sectionClass: "bg-amber-50 hover:bg-amber-100",
    dotClass: "bg-amber-500",
  },
  {
    status: "rejeitado",
    label: "Rejeitado",
    sectionClass: "bg-red-50 hover:bg-red-100",
    dotClass: "bg-red-500",
  },
  {
    status: "cancelado",
    label: "Cancelado",
    sectionClass: "bg-slate-50 hover:bg-slate-100",
    dotClass: "bg-slate-500",
  },
];

const NfceDemoPage = () => {
  const { idRestaurante } = useAuth();
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedNfce, setSelectedNfce] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [syncSimulating, setSyncSimulating] = useState(false);
  const [demonstrationMode, setDemonstrationMode] = useState("individual");
  const [showEmissionModal, setShowEmissionModal] = useState(false);

  const defaultMockNfce = Object.values(NFCE_MOCKS)[0] || {};
  const demoPedidoId =
    selectedNfce?.numero_pedido ||
    selectedNfce?.referencia ||
    selectedNfce?.pedidoId ||
    selectedNfce?.pedido_id ||
    defaultMockNfce.numero_pedido ||
    "1E0mBxNFXKr5u9KNpkhe";
  const demoMesaId = selectedNfce?.mesa || defaultMockNfce.mesa || "Mesa 1";

  const handleOpenEmissionModal = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("mockNfce", "1");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    setShowEmissionModal(true);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleViewDetails = (nfce) => {
    setSelectedNfce(nfce);
    setShowDetailsModal(true);
  };

  const handleSimulateSync = () => {
    if (!selectedNfce) return;
    setSyncSimulating(true);

    setTimeout(() => {
      const result = simulateSyncNfceDocuments(selectedNfce.id);
      if (result) {
        setSelectedNfce(result.nfces);
      }
      setSyncSimulating(false);
    }, 2000);
  };

  const handleSimulateCancel = () => {
    if (!selectedNfce || !selectedNfce.id) return;

    const justificativa = window.prompt(
      "Informe a justificativa do cancelamento:",
      "Cancelado para testes"
    );

    if (justificativa) {
      const cancelada = simulateCancelNfce(selectedNfce.id, justificativa);
      setSelectedNfce(cancelada);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-6">
      {/* Cabeçalho */}
      <CardHeader
        title="🧪 Demonstração de NFC-e"
        subtitle="Visualize todos os estados e funcionalidades de notas fiscais eletrônicas com dados mock"
        showButton={false}
      />

      {/* Seletor de Modo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setDemonstrationMode("individual")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              demonstrationMode === "individual"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300"
            }`}
          >
            Vista Individual
          </button>
          <button
            onClick={() => setDemonstrationMode("comparison")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              demonstrationMode === "comparison"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300"
            }`}
          >
            Comparação de Estados
          </button>
          <button
            onClick={() => setDemonstrationMode("pagination")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              demonstrationMode === "pagination"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300"
            }`}
          >
            Listagem com Paginação
          </button>
          <button
            onClick={handleOpenEmissionModal}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
          >
            📝 Testar Emissão
          </button>
          <button
            onClick={async () => {
              try {
                console.debug('Running real preview (demo) with', demoPedidoId, demoMesaId, idRestaurante);
                const sampleOrder = {
                  id: demoPedidoId,
                  items: [ { id: 'demo-item-1', nome: 'Item Demo', price: 10.0, quantity: 1 } ],
                  pagamentos: [ { formaPagamento: 'dinheiro', valor: 10.0 } ],
                };
                const res = await visualizarPreviaDanfce({ idRestaurante, mesaId: demoMesaId, pedidoId: demoPedidoId, cpfConsumidor: null, orderData: sampleOrder });
                console.debug('visualizarPreviaDanfce response (demo):', res);
                alert('Prévia chamada. Veja console e functions emulator logs.');
              } catch (err) {
                console.error('Erro ao chamar visualizarPreviaDanfce (demo):', err);
                alert('Erro ao chamar prévia. Veja console.');
              }
            }}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-yellow-600 text-white hover:bg-yellow-700"
          >
            🚨 Chamar Prévia Real (debug)
          </button>
          <div className="px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            Modal em modo visual (mock)
          </div>
          <div className="px-3 py-2 rounded-md bg-white border border-gray-200 text-xs text-gray-600">
            Pedido de teste: <span className="font-semibold text-gray-800">{demoPedidoId}</span>
          </div>
        </div>
      </div>

      {/* MODO 1: INDIVIDUAL */}
      {demonstrationMode === "individual" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-lg font-semibold mb-4">Selecione um Estado</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {Object.entries(NFCE_MOCKS).map(([key, nfce]) => (
                <button
                  key={key}
                  onClick={() => handleViewDetails(nfce)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedNfce?.id === nfce.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="font-medium text-sm">{nfce.numero}</div>
                  <div className="text-xs text-gray-600">
                    ID: {nfce.id?.split("_")[1]}
                  </div>
                  <div className={`text-xs font-semibold mt-1 inline-block px-2 py-0.5 rounded ${
                    nfce.status === "autorizado"
                      ? "bg-emerald-100 text-emerald-700"
                      : nfce.status === "pendente" || nfce.status === "processando"
                        ? "bg-amber-100 text-amber-700"
                        : nfce.status === "rejeitado"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                  }`}>
                    {nfce.status}
                  </div>
                </button>
              ))}
            </div>

            {selectedNfce && (
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">NFC-e #{selectedNfce.numero}</h3>

                {/* Informações Básicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-medium text-gray-600">ID</label>
                    <div className="text-sm font-mono">{selectedNfce.id}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Status</label>
                    <div className="text-sm">{selectedNfce.status}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Valor</label>
                    <div className="text-sm font-semibold">
                      R$ {(selectedNfce.valor || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Data</label>
                    <div className="text-sm">
                      {new Date(selectedNfce.criado_em).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  {selectedNfce.chave && (
                    <div>
                      <label className="text-xs font-medium text-gray-600">Chave</label>
                      <div className="text-xs font-mono">{selectedNfce.chave}</div>
                    </div>
                  )}
                  {selectedNfce.protocolo && (
                    <div>
                      <label className="text-xs font-medium text-gray-600">Protocolo</label>
                      <div className="text-xs font-mono">{selectedNfce.protocolo}</div>
                    </div>
                  )}
                </div>

                {/* Cliente */}
                {selectedNfce.cliente && (
                  <div className="mb-6 pb-6 border-b">
                    <h4 className="font-medium text-sm mb-3">Cliente</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <label className="text-xs text-gray-600">Nome</label>
                        <div>{selectedNfce.cliente.nome}</div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Email</label>
                        <div>{selectedNfce.cliente.email || "-"}</div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Telefone</label>
                        <div>{selectedNfce.cliente.telefone || "-"}</div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Pedido</label>
                        <div>{selectedNfce.numero_pedido}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Itens */}
                {selectedNfce.itens && (
                  <div className="mb-6 pb-6 border-b">
                    <h4 className="font-medium text-sm mb-3">Itens ({selectedNfce.itens.length})</h4>
                    <div className="space-y-2">
                      {selectedNfce.itens.map((item) => (
                        <div key={item.id} className="text-sm border rounded p-2 bg-gray-50">
                          <div className="font-medium">{item.descricao}</div>
                          <div className="text-xs text-gray-600">
                            {item.quantidade}x R$ {(item.valor_unitario || 0).toFixed(2)} =
                            <span className="font-semibold">
                              {" "}
                              R$ {(item.valor_total || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documentos */}
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-medium text-sm mb-3">Documentos</h4>
                  <div className="space-y-2">
                    {selectedNfce.url_danfce && (
                      <a
                        href={selectedNfce.url_danfce}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-blue-600 hover:underline"
                      >
                        📄 DANFE (PDF)
                      </a>
                    )}
                    {selectedNfce.url_xml && (
                      <a
                        href={selectedNfce.url_xml}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-blue-600 hover:underline"
                      >
                        📋 XML
                      </a>
                    )}
                    {selectedNfce.url_pdf && (
                      <a
                        href={selectedNfce.url_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-blue-600 hover:underline"
                      >
                        📎 PDF
                      </a>
                    )}
                    {!selectedNfce.url_danfce && !selectedNfce.url_xml && (
                      <div className="text-xs text-gray-500">
                        Nenhum documento disponível (NFC-e em processamento ou rejeitada)
                      </div>
                    )}
                  </div>
                </div>

                {/* Erros */}
                {selectedNfce.erro && (
                  <div className="mb-6 pb-6 border-b bg-red-50 border-red-200 rounded p-3">
                    <h4 className="font-medium text-sm text-red-800 mb-2">Erro</h4>
                    <div className="text-xs text-red-700">
                      <div>
                        <strong>Código:</strong> {selectedNfce.erro.codigo}
                      </div>
                      <div>
                        <strong>Mensagem:</strong> {selectedNfce.erro.mensagem}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ações Simuladas */}
                <div className="flex gap-2">
                  {selectedNfce.status === "pendente" && (
                    <button
                      onClick={handleSimulateSync}
                      disabled={syncSimulating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                      {syncSimulating ? "Sincronizando..." : "Simular Sincronização"}
                    </button>
                  )}
                  {["autorizado", "pendente"].includes(selectedNfce.status) && (
                    <button
                      onClick={handleSimulateCancel}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium transition-colors"
                    >
                      Simular Cancelamento
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedNfce(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODO 2: COMPARAÇÃO */}
      {demonstrationMode === "comparison" && (
        <div className="space-y-6">
          {DEMO_STATES.map((state) => (
            <div key={state.status} className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => toggleSection(state.status)}
                className={`w-full px-6 py-4 transition-colors flex items-center justify-between ${state.sectionClass}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${state.dotClass}`}
                  ></div>
                  <h3 className="font-semibold">{state.label}</h3>
                </div>
                {expandedSection === state.status ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>

              {expandedSection === state.status && (
                <div className="p-6">
                  {getMockNfceByStatus(state.status).length > 0 ? (
                    <NfceTable
                      nfces={getMockNfceByStatus(state.status)}
                      onViewDetails={handleViewDetails}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma NFC-e no estado "{state.label}"
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODO 3: PAGINAÇÃO */}
      {demonstrationMode === "pagination" && (
        <ModoListagemPaginada />
      )}

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedNfce && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                NFC-e #{selectedNfce.numero}
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedNfce(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(selectedNfce, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Emissão */}
      <NfceModal
        isOpen={showEmissionModal}
        onClose={() => setShowEmissionModal(false)}
        idRestaurante={idRestaurante || "demo_restaurant"}
        mesaId={demoMesaId}
        pedidoId={demoPedidoId}
      />
    </div>
  );
};

function ModoListagemPaginada() {
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 50;

  const { nfces, total } = getMockNfceList(ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="bg-white rounded-lg p-6 shadow-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Mostrando{" "}
          <span className="font-semibold">
            {currentPage * ITEMS_PER_PAGE + 1}
          </span>{" "}
          a{" "}
          <span className="font-semibold">
            {Math.min((currentPage + 1) * ITEMS_PER_PAGE, total)}
          </span>{" "}
          de <span className="font-semibold">{total}</span> NFC-es
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-3 py-2 bg-gray-100 rounded disabled:opacity-50"
          >
            ← Anterior
          </button>
          <div className="px-3 py-2 bg-gray-50 rounded">
            Página {currentPage + 1} de {totalPages}
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-3 py-2 bg-gray-100 rounded disabled:opacity-50"
          >
            Próxima →
          </button>
        </div>
      </div>

      <NfceTable nfces={nfces} />
    </div>
  );
}

export default NfceDemoPage;

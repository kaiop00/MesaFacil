import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import {
  FileDocument,
  TrendingDown,
  DownloadPackage,
  Note,
} from "react-coolicons";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMovimentacoesByItem } from "@/services/firebase/firestoreService";
import { pluralizeUnit } from "@/services/utils/unitConversionService";

const ItemDetailsModal = ({ isOpen, onClose, item }) => {
  const { idRestaurante } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);

  const carregarMovimentacoes = useCallback(async () => {
    if (!item?.id || !idRestaurante) {
      return;
    }

    setLoadingMovimentacoes(true);
    try {
      const movimentacoesItem = await getMovimentacoesByItem(
        idRestaurante,
        item.id
      );

      const movimentacoesOrdenadas = movimentacoesItem
        .sort((a, b) => {
          const dateA = new Date(a.data || a.createdAt || 0);
          const dateB = new Date(b.data || b.createdAt || 0);
          return dateB - dateA;
        });

      setMovimentacoes(movimentacoesOrdenadas);
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
      setMovimentacoes([]);
    } finally {
      setLoadingMovimentacoes(false);
    }
  }, [idRestaurante, item?.id]);

  useEffect(() => {
    if (isOpen && item && idRestaurante) {
      carregarMovimentacoes();
    }
  }, [isOpen, item, idRestaurante, carregarMovimentacoes]);

  if (!item) return null;

  const formatValue = (value) => {
    if (value === undefined || value === null) return "-";
    return value;
  };

  const getStatusEstoque = (atual, baixo, medio, alto) => {
    if (atual <= baixo) {
      return { color: "text-red-600", bg: "bg-red-100", status: "Baixo" };
    } else if (atual <= medio) {
      return { color: "text-yellow-600", bg: "bg-yellow-100", status: "Médio" };
    } else if (atual <= alto) {
      return { color: "text-green-600", bg: "bg-green-100", status: "Alto" };
    } else {
      return {
        color: "text-blue-600",
        bg: "bg-blue-100",
        status: "Muito Alto",
      };
    }
  };

  const statusEstoque = getStatusEstoque(
    item.estoqueAtual,
    item.estoqueBaixo,
    item.estoqueMedio,
    item.estoqueAlto,
  );

  const totalConsumido = movimentacoes
    .filter(
      (mov) =>
        (mov.pedidoReferencia &&
        !mov.pedidoReferencia.startsWith("CANCELAMENTO")) ||
        (mov.tipoMovimentacao === "Saída - Pedido")
    )
    .reduce((acc, mov) => acc + (mov.quantidade || 0), 0);

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title={item.nome || "Detalhes do Item"}
      subTitle="Relação de dados cadastrados do Item"
      icon={FileDocument}
    >
      <div className="space-y-4 mt-4">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Informações Básicas
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Nome</p>
              <p className="mt-1 text-sm text-gray-900">
                {formatValue(item.nome)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Marca</p>
              <p className="mt-1 text-sm text-gray-900">
                {formatValue(item.marca)}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unidades</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Unidade de Armazenamento
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatValue(item.unidadeArmazenamento || "Unidade")}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Unidade de Compra
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatValue(item.unidadeCompra || "Unidade")}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Estoque</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Estoque Atual
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatValue(item.estoqueAtual)}{" "}
                  {pluralizeUnit(item.unidadeArmazenamento || 'Unidade', item.estoqueAtual).toLowerCase()}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusEstoque.bg} ${statusEstoque.color}`}
              >
                {statusEstoque.status}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Estoque Baixo
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatValue(item.estoqueBaixo)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Estoque Médio
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatValue(item.estoqueMedio)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Estoque Alto
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatValue(item.estoqueAlto)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas de Consumo */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Consumo por Pedidos
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Note className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Total Consumido
                </span>
              </div>
              <p className="text-lg font-semibold text-orange-600 mt-1">
                {totalConsumido.toFixed(2)} {pluralizeUnit(item.unidadeArmazenamento || "Unidade", totalConsumido).toLowerCase()}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <DownloadPackage className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Movimentações
                </span>
              </div>
              <p className="text-lg font-semibold text-blue-600 mt-1">
                {movimentacoes.length}
              </p>
            </div>
          </div>
        </div>

        {/* Movimentações Recentes */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Movimentações Recentes
          </h3>
          {loadingMovimentacoes ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              <span className="ml-2 text-sm text-gray-500">Carregando...</span>
            </div>
          ) : movimentacoes.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <DownloadPackage className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {movimentacoes.map((mov, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        mov.pedidoReferencia?.startsWith("CANCELAMENTO")
                          ? "bg-red-500"
                          : mov.tipoMovimentacao === "Saída - Pedido" || 
                            mov.tipoMovimentacao === "Saida" || 
                            mov.pedidoReferencia
                            ? "bg-orange-500"
                            : "bg-green-500"
                      }`}
                      ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {mov.tipoMovimentacao || (mov.pedidoReferencia ? "Saída - Pedido" : "Movimentação")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {mov.data
                          ? new Date(mov.data).toLocaleDateString("pt-BR")
                          : "Data não informada"}
                        {mov.pedidoReferencia && (
                          <span className="ml-2">
                            • Pedido{" "}
                            {mov.pedidoReferencia
                              .replace("CANCELAMENTO-", "")
                              .substring(0, 8)}
                            ...
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold flex items-center space-x-1 ${
                        mov.tipoMovimentacao === "Saída - Pedido" || 
                        mov.tipoMovimentacao === "Saida" || 
                        mov.pedidoReferencia ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      <TrendingDown
                        className={`w-3 h-3 ${mov.tipoMovimentacao === "Saída - Pedido" || 
                          mov.tipoMovimentacao === "Saida" || 
                          mov.pedidoReferencia ? "rotate-0" : "rotate-180"}`}
                      />
                      <span>
                        {mov.tipoMovimentacao === "Saída - Pedido" || 
                         mov.tipoMovimentacao === "Saida" || 
                         mov.pedidoReferencia ? "-" : "+"}
                        {mov.quantidade || 0} {pluralizeUnit(mov.unidadeArmazenamento || "Unidade", Math.abs(mov.quantidade || 0)).toLowerCase()}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Saldo: {mov.novoSaldo !== undefined ? mov.novoSaldo : "N/A"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </BaseModalWithHeader>
  );
};

export default ItemDetailsModal;

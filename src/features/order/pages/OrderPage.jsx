import CardHeader from "@/components/CardHeader";
import TableSection from "@/features/order/components/TableSection";
import NewOrderModal from "@/features/order/components/modals/NewOrderModal";
import AddItemsModal from "@/features/order/components/modals/AddItemsModal";
import { OrderProvider } from "@/features/order/context/OrderContext";
import { useState, useMemo } from "react";
import { useTables } from "@/features/config/hooks/useTables";
import { CardapioProvider } from "@/features/foodList/context/CardapioContext";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic"; // ✅ seu spinner

const OrderPage = () => {
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [selectedTable, setSelectedtable] = useState(null);
  const { idRestaurante } = useAuth();
  const { mesasLivres, mesasAndamento, mesasEntregues, tables } = useTables(idRestaurante);

  const isLoading = tables.length > 0 &&
    (mesasAndamento.length === 0 && mesasEntregues.length === 0 && mesasLivres.length === 0);

  const mesasLivresDisplay = useMemo(
    () => mesasLivres.map(mapTableDisplay),
    [mesasLivres]
  );
  const mesasAndamentoDisplay = useMemo(
    () => mesasAndamento.map(mapTableDisplay),
    [mesasAndamento]
  );
  const mesasEntreguesDisplay = useMemo(
    () => mesasEntregues.map(mapTableDisplay),
    [mesasEntregues]
  );

  function mapTableDisplay(table) {
    return {
      numero: table.numero ?? "-",
      timeAgo: table.timeAgo ?? "-",
      total: Number(table.total ?? 0).toFixed(2),
      mesa: table,
    };
  }

  const handleNew = () => setIsNewOrderModalOpen(true);
  const handleCloseNewOrder = () => setIsNewOrderModalOpen(false);
  const handleCloseAddItems = () => setIsAddItemsModalOpen(false);
  const openAddItemsModal = (mesa) => {
    setSelectedtable(mesa);
    setIsAddItemsModalOpen(true);
  }

  return (
    <CardapioProvider>
      <OrderProvider>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-12">

          <CardHeader
            title="Produtos"
            subtitle="Gerencie os produtos da sua loja"
            onNewClick={handleNew}
            buttonTitle="Novo Pedido"
          />

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <LoadingSpinnerDynamic size={10} />
              <p className="mt-4">Carregando mesas e pedidos...</p>
            </div>
          ) : (
            <>
              <TableSection
                title="Pedidos Entregues"
                status="entregue"
                items={mesasEntreguesDisplay}
                idRestaurante={idRestaurante}
              />
              <TableSection
                title="Pedidos em Andamento"
                status="andamento"
                items={mesasAndamentoDisplay}
                idRestaurante={idRestaurante}
              />
              <TableSection
                title="Mesas Livres"
                status="livre"
                items={mesasLivresDisplay}
                idRestaurante={idRestaurante}
              />
            </>
          )}

          <NewOrderModal
            isOpen={isNewOrderModalOpen}
            onClose={handleCloseNewOrder}
            openAddItemsModal={openAddItemsModal}
          />

          <AddItemsModal
            isOpen={isAddItemsModalOpen}
            onClose={handleCloseAddItems}
            selectedTable={selectedTable}
          />
        </div>
      </OrderProvider>
    </CardapioProvider>
  );
};

export default OrderPage;

// /features/order/pages/OrderPage.jsx

import CardHeader from "@/components/CardHeader";
import TableSection from "@/features/order/components/TableSection";
import NewOrderModal from "@/features/order/components/modals/NewOrderModal";
import AddItemsModal from "@/features/order/components/modals/AddItemsModal";
import { OrderProvider } from "@/features/order/context/OrderContext";
import { useState } from "react";
import { useTables } from "@/features/config/hooks/useTables";
import { CardapioProvider } from "@/features/foodList/context/CardapioContext";
import { useAuth } from "@/contexts/AuthContext";

const OrderPage = () => {
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const { idRestaurante } = useAuth();
  const { mesasLivres, mesasAndamento, mesasEntregues } = useTables();

  const mesasLivresDisplay = mesasLivres.map(mapTableDisplay);
  const mesasAndamentoDisplay = mesasAndamento.map(mapTableDisplay);
  const mesasEntreguesDisplay = mesasEntregues.map(mapTableDisplay);

  function mapTableDisplay(table) {
    return {
      table: `Mesa ${table.numero}`,
      numero: table.numero,
      timeAgo: "-",
      price: "-",
      mesa: table
    };
  }


  const handleNew = () => setIsNewOrderModalOpen(true);
  const handleCloseNewOrder = () => setIsNewOrderModalOpen(false);
  const handleCloseAddItems = () => setIsAddItemsModalOpen(false);
  const openAddItemsModal = () => setIsAddItemsModalOpen(true);

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

          <TableSection title="Pedidos Pendentes" status="entregue" items={mesasEntreguesDisplay} idRestaurante={idRestaurante} />
          <TableSection title="Pedidos em Andamento" status="andamento" items={mesasAndamentoDisplay} idRestaurante={idRestaurante} />
          <TableSection title="Mesas Livres" status="livre" items={mesasLivresDisplay} idRestaurante={idRestaurante} />

          <NewOrderModal
            isOpen={isNewOrderModalOpen}
            onClose={handleCloseNewOrder}
            openAddItemsModal={openAddItemsModal}
          />

          <AddItemsModal isOpen={isAddItemsModalOpen} onClose={handleCloseAddItems} />
        </div>
      </OrderProvider>
    </CardapioProvider>
  );
};

export default OrderPage;

import CardHeader from "@/components/CardHeader";
import TableSection from "@/features/order/components/TableSection";
import NewOrderModal from "@/features/order/components/modals/NewOrderModal";
import { useEffect, useState } from "react";
import { useTables } from "@/features/config/hooks/useTables"

const OrderPage = () => {

  const [isModalOpen, setIsModalOpen] = useState(false);

  const { mesasLivres, mesasAndamento, mesasPendentes } = useTables();

  const mesasLivresDisplay = mesasLivres.map(mapTableDisplay);
  const mesasAndamentoDisplay = mesasAndamento.map(mapTableDisplay);
  const mesasPendentesDisplay = mesasPendentes.map(mapTableDisplay);

  function mapTableDisplay(table) {
    return {
      table: `Mesa ${table.numero}`,
      numero: table.numero,
      timeAgo: "-",
      price: "-",
    };
  }

  useEffect(() => {
    console.log(mesasLivres);
  })

  const handleNew = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-12">
      {/* Cabeçalho de produtos */}
      <CardHeader
        title="Produtos"
        subtitle="Gerencie os produtos da sua loja"
        onNewClick={handleNew}
        buttonTitle="Novo Pedido"
      />

      {/* Seção de Pedidos em pendentes */}
      <TableSection
        title="Pedidos em Andamento"
        status={"pendente"}
        items={mesasPendentesDisplay}
      />

      {/* Seção de Pedidos em Andamento */}
      <TableSection
        title="Pedidos em Andamento"
        status={"andamento"}
        items={mesasAndamentoDisplay}
      />

      {/* Seção de Mesas Livres */}
      <TableSection
        title="Mesas Livres"
        status={"livre"}
        items={mesasLivresDisplay}
      />

      <NewOrderModal isOpen={isModalOpen} onClose={handleClose} />
    </div>
  );
};

export default OrderPage;

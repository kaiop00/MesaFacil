import CardHeader from "@/components/CardHeader";
import TableSection from "@/components/TableSection";

const OrderPage = () => {
  const handleNew = () => {
    alert("Abrir modal de novo pedido");
  };

  // dados de exemplo; troque pelos dados reais da sua API
  const pedidosAndamento = [
    { table: "Mesa 01", timeAgo: "12 minutos", price: "220,20" },
    { table: "Mesa 02", timeAgo: "14 minutos", price: "220,20" },
    { table: "Mesa 03", timeAgo: "15 minutos", price: "220,20" },
    { table: "Mesa 04", timeAgo: "20 minutos", price: "220,20" },
    { table: "Mesa 05", timeAgo: "23 minutos", price: "220,20" },
    { table: "Mesa 06", timeAgo: "25 minutos", price: "220,20" },
    { table: "Mesa 07", timeAgo: "30 minutos", price: "220,20" },
    { table: "Mesa 08", timeAgo: "32 minutos", price: "220,20" },
  ];

  const mesasLivres = [
    { table: "Mesa 09" },
    { table: "Mesa 10" },
    { table: "Mesa 11" },
    { table: "Mesa 12" },
    { table: "Mesa 13" },
    { table: "Mesa 14" },
    { table: "Mesa 15" },
    { table: "Mesa 16" },
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-12">
      {/* Cabeçalho de produtos */}
      <CardHeader
        title="Produtos"
        subtitle="Gerencie os produtos da sua loja"
        onNewClick={handleNew}
        buttonTitle="Novo Pedido"
      />

      {/* Seção de Pedidos em Andamento */}
      <TableSection
        title="Pedidos em Andamento"
        occupied
        items={pedidosAndamento}
      />

      {/* Seção de Mesas Livres */}
      <TableSection title="Mesas Livres" occupied={false} items={mesasLivres} />
    </div>
  );
};

export default OrderPage;

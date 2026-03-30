import CardHeader from "@/components/CardHeader";
import PermissionDeniedPage from "@/components/PermissionDeniedPage";
import TableSection from "@/features/order/components/TableSection";
import NewOrderModal from "@/features/order/components/modals/NewOrderModal";
import AddItemsModal from "@/features/order/components/modals/AddItemsModal";
import { OrderProvider } from "@/features/order/context/OrderContext";
import { useEffect, useMemo, useState } from "react";
import { useTables } from "@/features/config/hooks/useTables";
import { CardapioProvider } from "@/features/foodList/context/CardapioContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic"; // ✅ seu spinner
import DetailOrderModal from "@/features/order/components/modals/DetailOrderModal";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import IfoodStatusMonitor from "@/features/integrations/ifood/components/IfoodStatusMonitor";

const OrderPage = () => {
  const { t } = useTranslation('order');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [selectedTable, setSelectedtable] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [mesaDetalhe, setMesaDetalhe] = useState(null);
  const { idRestaurante } = useAuth();
  const { hasPermission } = usePermissions();
  const { mesasLivres, mesasAndamento, mesasEntregues, tables } = useTables(idRestaurante);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleOpenDetailModal = (mesa) => {
    if (!mesa) return;
    setMesaDetalhe(mesa);
    setIsDetailModalOpen(true);
  };

  // Abrir detalhes via deep-link (?mesaId=...)
  useEffect(() => {
    const mesaId = searchParams.get('mesaId');
    if (!mesaId || tables.length === 0) return;
    const mesa = tables.find((m) => m.id === mesaId);
    if (mesa) {
      setMesaDetalhe(mesa);
      setIsDetailModalOpen(true);
    }
  }, [searchParams, tables]);

  if (!hasPermission('view_orders')) {
    return (
      <PermissionDeniedPage 
        message={t('page.noPermissionMessage')}
        description={t('page.contactAdmin')}
      />
    );
  }

  return (
    <CardapioProvider>
      <OrderProvider>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-12">
          
          {/* Monitor de status do iFood - funciona em background */}
          <IfoodStatusMonitor 
            idRestaurante={idRestaurante} 
            enabled={hasPermission('view_orders')} 
          />

          {hasPermission('create_orders') && (
            <CardHeader
              title={t('page.title')}
              subtitle={t('page.subtitle')}
              onNewClick={handleNew}
              buttonTitle={t('tables.actions.newOrder')}
            />
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <LoadingSpinnerDynamic size={10} />
              <p className="mt-4">{t('page.loading')}</p>
            </div>
          ) : (
            <>
              <TableSection
                title={t('tables.status.entregue')}
                status="entregue"
                items={mesasEntreguesDisplay}
                idRestaurante={idRestaurante}
                onOpenDetail={handleOpenDetailModal}
              />
              <TableSection
                title={t('tables.status.andamento')}
                status="andamento"
                items={mesasAndamentoDisplay}
                idRestaurante={idRestaurante}
                onOpenDetail={handleOpenDetailModal}
              />
              <TableSection
                title={t('tables.status.livre')}
                status="livre"
                items={mesasLivresDisplay}
                idRestaurante={idRestaurante}
                onOpenDetail={handleOpenDetailModal}
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

          {/* Modal de detalhes aberto via deep-link */}
          <DetailOrderModal
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setMesaDetalhe(null);
              // Remove o query param da URL
              const sp = new URLSearchParams(location.search);
              sp.delete('mesaId');
              navigate({ search: sp.toString() }, { replace: true });
            }}
            mesaSelecionada={mesaDetalhe}
            idRestaurante={idRestaurante}
          />
        </div>
      </OrderProvider>
    </CardapioProvider>
  );
};

export default OrderPage;

import { useState } from "react";
import CardHeader from "@/components/CardHeader";
import PermissionDeniedPage from "@/components/PermissionDeniedPage";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/useToast";
import KitchenOrderCard from "@/features/kitchen/components/KitchenOrderCard";
import { useKitchenOrders } from "@/features/kitchen/hooks/useKitchenOrders";
import { useKitchenPrint } from "@/features/kitchen/hooks/useKitchenPrint";
import { finalizarPedidoEspecifico } from "@/features/order/services/orderService";

const KitchenPage = () => {
  const { t } = useTranslation("kitchen");
  const { notify } = useToast();
  const { idRestaurante } = useAuth();
  const { hasPermission } = usePermissions();
  const { orders, loading, error, refetch } = useKitchenOrders(idRestaurante);
  const { printOrder } = useKitchenPrint();
  const [finalizingId, setFinalizingId] = useState(null);

  const handleFinalize = async (order) => {
    if (!idRestaurante || !order?.mesaId || !order?.id) {
      return;
    }

    setFinalizingId(order.id);
    try {
      await finalizarPedidoEspecifico(idRestaurante, order.mesaId, order.id, {}, false);
      notify(t("messages.success"), "success");
      await refetch();
    } catch (err) {
      console.error("[KitchenPage] Erro ao finalizar pedido:", err);
      notify(t("messages.error"), "error");
    } finally {
      setFinalizingId(null);
    }
  };

  if (!hasPermission('view_kitchen')) {
    return (
      <PermissionDeniedPage 
        message={t("page.noPermissionMessage")}
        description={t("page.contactAdmin")}
      />
    );
  }

  return (
    <div className="mt-24 space-y-8 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
      <CardHeader
        title={t("page.title")}
        subtitle={t("page.subtitle")}
        showButton={false}
        extraContent={
          <button
            type="button"
            onClick={refetch}
            className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer"
          >
            {t("page.refresh")}
          </button>
        }
      />

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500">
          <LoadingSpinnerDynamic size={10} />
          <p>{t("states.loading")}</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
          <p className="font-semibold">{t("errors.load")}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 text-sm font-semibold underline cursor-pointer"
          >
            {t("page.tryAgain")}
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center text-gray-500">
          {t("states.empty")}
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              onFinalize={handleFinalize}
              onPrint={printOrder}
              finalizing={finalizingId === order.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenPage;

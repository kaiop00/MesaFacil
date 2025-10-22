import { useMemo } from "react";
import { Printer, Building03 } from "react-coolicons";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import KitchenOrderItem from "./KitchenOrderItem";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

const KitchenOrderCard = ({ order, onFinalize, onPrint, finalizing }) => {
  const { t } = useTranslation("kitchen");

  const timeAgo = useMemo(() => {
    if (!order?.criadoEm) {
      return t("cards.unknownTime");
    }

    return formatDistanceToNow(order.criadoEm, {
      locale: ptBR,
      addSuffix: true,
    });
  }, [order?.criadoEm, t]);

  const totalLabel = formatCurrency(order?.total);
  const observation =
    order?.observacoes?.trim() || t("cards.noObservations");

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary-dynamic-opacity p-3 text-primary-dynamic">
            <Building03 size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {t("cards.table", { numero: order?.mesaNumero ?? "-" })}
            </p>
            <p className="text-xs text-gray-500">
              {t("cards.orderedAt", { tempo: timeAgo })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPrint?.(order)}
            className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-100 cursor-pointer"
          >
            {t("cards.print")}
            <Printer size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <p className="text-xl font-semibold text-primary-dynamic">{totalLabel}</p>
        <button
          type="button"
          onClick={() => onFinalize(order)}
          disabled={finalizing}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition cursor-pointer ${
            finalizing
              ? "bg-gray-300"
              : "bg-primary-dynamic hover:bg-primary-dynamic/90"
          }`}
        >
          {finalizing ? t("cards.finalizing") : t("cards.finish")}
        </button>
      </div>

      <section>
        <h4 className="text-sm font-semibold text-gray-800 mb-2">
          {t("cards.items")}
        </h4>
        <div className="space-y-2">
          {order?.items?.map((item) => (
            <KitchenOrderItem
              key={`${order.id}-${item.id}`}
              item={item}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      </section>

      <section>
        <h4 className="text-sm font-semibold text-gray-800 mb-1">
          {t("cards.observations")}
        </h4>
        <p className="text-sm text-gray-600">{observation}</p>
      </section>
    </article>
  );
};

export default KitchenOrderCard;

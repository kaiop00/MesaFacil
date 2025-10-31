import { useState } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { Bell, MoreHorizontal, House02 } from "react-coolicons";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const NotificationsModal = ({ isOpen, onClose, notifications, onMarkAll, onMarkOne, onView, loading }) => {
  const { t, i18n } = useTranslation();
  
  const formatData = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : ts;
      const locale = i18n.language === 'en' ? enUS : ptBR;
      const base = format(d, "dd MMMM yyyy - HH:mm", { locale });
      // date-fns retorna mês em minúsculas em ptBR; capitalizamos para bater com o layout
      return base.replace(/ (\p{L}+)/u, (m) => ` ${capitalizeFirst(m.trim())}`);
    } catch {
      return "-";
    }
  };
  const unread = notifications.filter((n) => n.read === false);
  const read = notifications.filter((n) => n.read === true);
  const [openMenuKey, setOpenMenuKey] = useState(null); // `${mesaId}-${id}`
  const [markingId, setMarkingId] = useState(null);

  const toggleMenu = (key) => {
    setOpenMenuKey((prev) => (prev === key ? null : key));
  };

  const handleMarkOne = async (n) => {
    if (!n || n.read || !onMarkOne) return;
    setMarkingId(`${n.mesaId}-${n.id}`);
    try {
      await onMarkOne(n);
      setOpenMenuKey(null);
    } finally {
      setMarkingId(null);
    }
  };

  const buildTitle = (notification) => {
    if (notification.tipo === "garcom") {
      return `${t("notifications:table")} ${notification.mesaNumero || notification.mesaId || "-"} ${t("notifications:requestedService")}`;
    }
    return `${t("notifications:newOrder")} ${notification.mesaNumero}`;
  };

  const buildSubtitle = (notification) => {
    if (notification.tipo === "garcom") {
      return notification.motivo
        ? `${t("notifications:reason")}: ${notification.motivo}`
        : t("notifications:waiterCall");
    }
    return null;
  };

  return (
    <BaseModalWithHeader
      isOpen={!!isOpen}
      onClose={onClose}
      title={t("notifications:title")}
      subTitle={t("notifications:subtitle")}
      icon={Bell}
    >
      <div className="space-y-3 font-inter">
        {notifications.length === 0 && (
          <p className="text-center text-gray-500 py-6">{t("notifications:noNotifications")}</p>
        )}

        {/* Não lidas */}
        {unread.map((n) => (
          <div key={`unread-${n.mesaId}-${n.id}`} className="relative border border-gray-200 rounded-lg p-3 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="relative w-9 h-9 rounded bg-primary-dynamic/20 flex items-center justify-center text-primary-dynamic">
                <House02 />
                {/* bolinha vermelha de não lido */}
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">
                  {buildTitle(n)}
                </p>
                <p className="text-xs text-gray-600">{formatData(n.criadoEm)}</p>
                {buildSubtitle(n) && (
                  <p className="text-xs text-gray-500 mt-0.5">{buildSubtitle(n)}</p>
                )}
              </div>
            </div>
            <button onClick={() => toggleMenu(`${n.mesaId}-${n.id}`)} className="h-8 w-8 rounded bg-gray-50 border border-gray-200 flex items-center justify-center">
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>

            {openMenuKey === `${n.mesaId}-${n.id}` && (
              <div className="absolute right-2 top-10 z-10 w-44 bg-white border border-gray-200 rounded-lg shadow-md p-2">
                <p className="text-xs text-gray-500 px-2 pb-2">{t("notifications:actions")}</p>
                <button
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded"
                  onClick={() => {
                    onView && onView(n.mesaId);
                    setOpenMenuKey(null);
                    onClose && onClose();
                  }}
                >
                  {t("notifications:details")}
                </button>
                <button
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded disabled:opacity-50"
                  onClick={() => handleMarkOne(n)}
                  disabled={n.read || markingId === `${n.mesaId}-${n.id}`}
                >
                  {markingId === `${n.mesaId}-${n.id}` ? t("notifications:marking") : t("notifications:markAsRead")}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Divider entre não lidas e lidas */}
        {unread.length > 0 && read.length > 0 && (
          <div className="flex items-center gap-3 py-1 select-none">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] uppercase tracking-wide text-gray-500">{t("notifications:read")}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {/* Lidas */}
        {read.map((n) => (
          <div key={`read-${n.mesaId}-${n.id}`} className="relative border border-gray-200 rounded-lg p-3 flex items-start justify-between opacity-80">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center text-gray-500"><House02/></div>
              <div>
                <p className="font-medium text-gray-700 text-sm">
                  {buildTitle(n)}
                </p>
                <p className="text-xs text-gray-500">{formatData(n.criadoEm)}</p>
                {buildSubtitle(n) && (
                  <p className="text-xs text-gray-400 mt-0.5">{buildSubtitle(n)}</p>
                )}
              </div>
            </div>
            <button disabled title={t("notifications:alreadyRead")} className="h-8 w-8 rounded bg-gray-50 border border-gray-200 flex items-center justify-center opacity-40 cursor-not-allowed">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ))}

        <div className="pt-2">
          <button
            onClick={onMarkAll}
            disabled={loading || unread.length === 0}
            className="w-full border border-gray-300 rounded py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? t("notifications:marking") : t("notifications:markAllAsRead")}
          </button>
        </div>
      </div>
    </BaseModalWithHeader>
  );
};

export default NotificationsModal;

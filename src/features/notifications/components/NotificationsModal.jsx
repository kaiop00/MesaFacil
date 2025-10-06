import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { Bell, MoreHorizontal, House02 } from "react-coolicons";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatData(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : ts;
    const base = format(d, "dd MMMM yyyy - HH:mm", { locale: ptBR });
    // date-fns retorna mês em minúsculas em ptBR; capitalizamos para bater com o layout
    return base.replace(/ (\p{L}+)/u, (m) => ` ${capitalizeFirst(m.trim())}`);
  } catch {
    return "-";
  }
}

import { useState } from "react";

const NotificationsModal = ({ isOpen, onClose, notifications, onMarkAll, onMarkOne, onView, loading }) => {
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
      return `Mesa ${notification.mesaNumero || notification.mesaId || "-"} solicitou atendimento`;
    }
    return `Novo pedido chegou - Pedido da mesa ${notification.mesaNumero}`;
  };

  const buildSubtitle = (notification) => {
    if (notification.tipo === "garcom") {
      return notification.motivo
        ? `Motivo: ${notification.motivo}`
        : "Chamada de garçom";
    }
    return null;
  };

  return (
    <BaseModalWithHeader
      isOpen={!!isOpen}
      onClose={onClose}
      title="Notificações"
      subTitle="Somente as notificações do dia"
      icon={Bell}
    >
      <div className="space-y-3 font-inter">
        {notifications.length === 0 && (
          <p className="text-center text-gray-500 py-6">Sem notificações hoje.</p>
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
                <p className="text-xs text-gray-500 px-2 pb-2">Ações</p>
                <button
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded"
                  onClick={() => {
                    onView && onView(n.mesaId);
                    setOpenMenuKey(null);
                    onClose && onClose();
                  }}
                >
                  Detalhes
                </button>
                <button
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded disabled:opacity-50"
                  onClick={() => handleMarkOne(n)}
                  disabled={n.read || markingId === `${n.mesaId}-${n.id}`}
                >
                  {markingId === `${n.mesaId}-${n.id}` ? 'Marcando…' : 'Marcar como Lida'}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Divider entre não lidas e lidas */}
        {unread.length > 0 && read.length > 0 && (
          <div className="flex items-center gap-3 py-1 select-none">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] uppercase tracking-wide text-gray-500">Lidas</span>
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
            <button disabled title="Já lida" className="h-8 w-8 rounded bg-gray-50 border border-gray-200 flex items-center justify-center opacity-40 cursor-not-allowed">
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
            {loading ? "Marcando..." : "Marcar todas como Lidas"}
          </button>
        </div>
      </div>
    </BaseModalWithHeader>
  );
};

export default NotificationsModal;

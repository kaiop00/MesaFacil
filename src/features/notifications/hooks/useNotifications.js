import { useEffect, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { startOfDay, endOfDay } from "date-fns";

// Util para converter Timestamp/Date para millis para comparações locais
const toMillis = (ts) => {
  if (!ts) return 0;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  return 0;
};

/**
 * Hook de notificações em tempo real (pedidos criados hoje)
 * - Lista apenas pedidos do dia atual (qualquer status)
 * - Calcula contagem de não lidos (read === false)
 * - Fornece ação para marcar todos os de hoje como lidos
 */
export function useNotifications(idRestaurante) {
  const [notifications, setNotifications] = useState([]);
  const [pedidoNotifications, setPedidoNotifications] = useState([]);
  const [eventoNotifications, setEventoNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const mesaUnsubsRef = useRef({});
  useEffect(() => {
    if (!idRestaurante) {
      setNotifications([]);
      setPedidoNotifications([]);
      setEventoNotifications([]);
      setUnreadCount(0);
      return;
    }

    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    const qStart = Timestamp.fromDate(start);
    const qEnd = Timestamp.fromDate(end);

    const mesasCol = collection(db, "restaurantes", idRestaurante, "mesas");
    const cleanupMesaListeners = () => {
      Object.keys(mesaUnsubsRef.current).forEach((mesaId) => {
        mesaUnsubsRef.current[mesaId]?.();
        delete mesaUnsubsRef.current[mesaId];
      });
    };

    const unsubscribe = onSnapshot(mesasCol, (snapshot) => {
      const mesas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      const currentIds = new Set(mesas.map((m) => m.id));
      Object.keys(mesaUnsubsRef.current).forEach((mesaId) => {
        if (!currentIds.has(mesaId)) {
          mesaUnsubsRef.current[mesaId]?.();
          delete mesaUnsubsRef.current[mesaId];
        }
      });

      const tempByMesa = {};

      mesas.forEach((mesa) => {
        const pedidosCol = collection(
          db,
          "restaurantes",
          idRestaurante,
          "mesas",
          mesa.id,
          "pedidos"
        );
        const qPed = query(
          pedidosCol,
          where("criadoEm", ">=", qStart),
          where("criadoEm", "<=", qEnd),
          orderBy("criadoEm", "desc")
        );

        mesaUnsubsRef.current[mesa.id]?.();
        mesaUnsubsRef.current[mesa.id] = onSnapshot(qPed, (snap) => {
          const items = snap.docs.map((d) => ({
            id: d.id,
            mesaId: mesa.id,
            mesaNumero: mesa.numero || mesa.nome || mesa.id,
            refPath: d.ref.path,
            ...d.data(),
          }));

          tempByMesa[mesa.id] = items;
          const all = Object.values(tempByMesa).flat();
          all.sort((a, b) => toMillis(b.criadoEm) - toMillis(a.criadoEm));
          setPedidoNotifications(all);
        });
      });
    });

    return () => {
      unsubscribe();
      cleanupMesaListeners();
    };
  }, [idRestaurante]);

  useEffect(() => {
    if (!idRestaurante) {
      setEventoNotifications([]);
      return;
    }

    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    const qStart = Timestamp.fromDate(start);
    const qEnd = Timestamp.fromDate(end);

    const notificacoesRef = collection(db, "restaurantes", idRestaurante, "notificacoes");
    const notificacoesQuery = query(
      notificacoesRef,
      where("criadoEm", ">=", qStart),
      where("criadoEm", "<=", qEnd),
      orderBy("criadoEm", "desc")
    );

    const unsubscribe = onSnapshot(notificacoesQuery, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          refPath: docSnap.ref.path,
          tipo: data.tipo || "evento",
          mesaId: data.mesaId,
          mesaNumero: data.mesaNumero,
          motivo: data.motivo,
          criadoEm: data.criadoEm,
          read: data.read ?? false,
          payload: data.itens || data.payload || [],
          pedidoId: data.pedidoId || null,
          total: data.total ?? 0,
          status: data.status || "pendente",
          origem: data.origem || "",
        };
      });
      setEventoNotifications(docs);
    });

    return () => unsubscribe();
  }, [idRestaurante]);

  useEffect(() => {
    const pedidosNormalizados = pedidoNotifications.map((notif) => ({
      ...notif,
      tipo: notif.tipo || "pedido",
    }));

    const combined = [...pedidosNormalizados, ...eventoNotifications];
    combined.sort((a, b) => toMillis(b.criadoEm) - toMillis(a.criadoEm));
    setNotifications(combined);
    setUnreadCount(combined.filter((n) => n.read === false).length);
  }, [pedidoNotifications, eventoNotifications]);

  const markAllAsRead = async () => {
    if (!idRestaurante || notifications.length === 0) return;
    const toMark = notifications.filter((n) => n.read === false);
    if (toMark.length === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      toMark.forEach((n) => {
        batch.update(doc(db, n.refPath), {
          read: true,
          lidoEm: Timestamp.now(),
        });
      });
      await batch.commit();
    } finally {
      setLoading(false);
    }
  };
  
  const markOneAsRead = async (notification) => {
    if (!notification || notification.read === true) return;
    const ref = doc(db, notification.refPath);
    await (await import("firebase/firestore")).updateDoc(ref, {
      read: true,
      lidoEm: Timestamp.now(),
    });
  };

  return {
    notifications, // somente de hoje
    unreadCount,   // não lidos de hoje
    loading,
    markAllAsRead,
    markOneAsRead,
  };
}

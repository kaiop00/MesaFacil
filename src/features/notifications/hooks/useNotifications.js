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
  const mesaUnsubsRef = useRef({}); // { mesaId: unsubscribe }
  const unsubscribeMesasRef = useRef(null);

  useEffect(() => {
    // Limpar listeners quando idRestaurante mudar
    Object.values(mesaUnsubsRef.current).forEach((fn) => fn && fn());
    mesaUnsubsRef.current = {};
    if (unsubscribeMesasRef.current) {
      unsubscribeMesasRef.current();
      unsubscribeMesasRef.current = null;
    }

    if (!idRestaurante) {
      setNotifications([]);
      setPedidoNotifications([]);
      setEventoNotifications([]);
      setUnreadCount(0);
      return;
    }

    // 1) Assina as mesas do restaurante
    const mesasCol = collection(db, "restaurantes", idRestaurante, "mesas");
    unsubscribeMesasRef.current = onSnapshot(mesasCol, (snapshot) => {
      const mesas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 2) Para cada mesa, assinar os pedidos de hoje
      const start = startOfDay(new Date());
      const end = endOfDay(new Date());
      const qStart = Timestamp.fromDate(start);
      const qEnd = Timestamp.fromDate(end);

      // Cancelar listeners antigos que não estão mais presentes
      const currentIds = new Set(mesas.map((m) => m.id));
      Object.keys(mesaUnsubsRef.current).forEach((mesaId) => {
        if (!currentIds.has(mesaId)) {
          mesaUnsubsRef.current[mesaId]?.();
          delete mesaUnsubsRef.current[mesaId];
        }
      });

      // Para acumular todas as notificações e depois unificar
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

        // Unsubscribe anterior, se existir
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

          // Unificar todas as mesas sempre que um listener atualizar
          const all = Object.values(tempByMesa).flat();
          all.sort((a, b) => toMillis(b.criadoEm) - toMillis(a.criadoEm));
          setPedidoNotifications(all);
        });
      });
    });

    return () => {
      Object.values(mesaUnsubsRef.current).forEach((fn) => fn && fn());
      mesaUnsubsRef.current = {};
      if (unsubscribeMesasRef.current) unsubscribeMesasRef.current();
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
    try {
      const ref = doc(db, notification.refPath);
      await (await import("firebase/firestore")).updateDoc(ref, {
        read: true,
        lidoEm: Timestamp.now(),
      });
    } catch (e) {
      // noop: deixamos o snapshot refletir estado; erros podem ser tratados pelo caller
      throw e;
    }
  };

  return {
    notifications, // somente de hoje
    unreadCount,   // não lidos de hoje
    loading,
    markAllAsRead,
    markOneAsRead,
  };
}

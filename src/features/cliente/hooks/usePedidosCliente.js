import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useCliente } from "../context/ClienteContext";
import { computeSubtotal, computeTotalPedidos } from "../utils/pedidos";
import { getClienteData } from "@/config/dexieConfig";
import { WHATSAPP_TABLE_ID } from "@/constants/whatsappConstants";

export function usePedidosCliente() {
    const { mesaId, idRestaurante } = useCliente();
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userCpf, setUserCpf] = useState(null);

    // Para mesa WhatsApp, busca o CPF do usuário do IndexedDB
    useEffect(() => {
        if (mesaId === WHATSAPP_TABLE_ID) {
            getClienteData().then(clientData => {
                if (clientData && clientData.cpf) {
                    setUserCpf(clientData.cpf);
                } else {
                    setUserCpf(null);
                }
            }).catch(err => {
                console.error("Erro ao carregar CPF do cliente:", err);
                setUserCpf(null);
            });
        }
    }, [mesaId]);

    useEffect(() => {
        if (!mesaId || !idRestaurante) {
            setPedidos([]);
            setLoading(false);
            return;
        }

        // Para mesa WhatsApp, aguarda o CPF ser carregado
        if (mesaId === WHATSAPP_TABLE_ID && userCpf === null) {
            return; // Ainda carregando CPF
        }

        setLoading(true);
        setError(null);

        const pedidosRef = collection(
            db,
            "restaurantes",
            idRestaurante,
            "mesas",
            mesaId,
            "pedidos"
        );

        // Para mesa WhatsApp, filtra por CPF do cliente
        let pedidosQuery;
        if (mesaId === WHATSAPP_TABLE_ID && userCpf) {
            pedidosQuery = query(
                pedidosRef,
                where("cliente.cpf", "==", userCpf),
                orderBy("criadoEm", "asc")
            );
        } else {
            pedidosQuery = query(pedidosRef, orderBy("criadoEm", "asc"));
        }

        const unsubscribe = onSnapshot(
            pedidosQuery,
            (snapshot) => {
                const todosPedidos = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    const items = Array.isArray(data.items) ? data.items : [];
                    const total = typeof data.total === "number" ? data.total : computeSubtotal(items);

                    return {
                        id: doc.id,
                        ...data,
                        items,
                        total,
                    };
                }).filter((pedido) => pedido.pedidoEvento !== true || pedido.evento !== "assistencia");

                setPedidos(todosPedidos);
                setLoading(false);
            },
            (err) => {
                console.error("Erro ao carregar pedidos da mesa", err);
                setError("Não foi possível carregar os pedidos no momento.");
                setPedidos([]);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [mesaId, idRestaurante, userCpf]);

    const totalPedidos = useMemo(() => computeTotalPedidos(pedidos), [pedidos]);

    return {
        pedidos,
        loading,
        error,
        totalPedidos,
        mesaId,
        idRestaurante,
    };
}

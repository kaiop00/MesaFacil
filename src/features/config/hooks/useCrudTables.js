// Arquivo: useMesas.js
import { useState, useEffect } from "react";
import { getAll, create } from "@/services/firebase/firestoreService";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { serverTimestamp } from "firebase/firestore";
import { remove } from "@/services/firebase/firestoreService";


export const useCrudTables = ({ isOpen, onClose }) => {
    const { notify } = useToast();
    const { idRestaurante } = useAuth();
    const [mesas, setMesas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tableType, setTableType] = useState(null);
    const [qtd, setQtd] = useState("");

    const resetForm = () => {
        setTableType(null);
        setQtd("");
    };

    const validateForm = () => {
        if (!tableType) {
            notify("Selecione o tipo de mesa.", "error");
            return false;
        }
        const quantidade = Number(qtd);
        if (!quantidade || quantidade <= 0) {
            notify("Informe uma quantidade válida.", "error");
            return false;
        }
        return true;
    };

    const carregarMesas = async () => {
        if (!idRestaurante) return;
        setLoading(true);
        try {
            const data = await getAll(idRestaurante, "mesas", { orderByField: "numero" });
            setMesas(data);
        } catch (error) {
            console.error(error);
            notify("Erro ao carregar mesas", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) carregarMesas();
    }, [isOpen, idRestaurante]);

    const handleAdd = () => {
        if (!validateForm()) return;
        const quantidade = Number(qtd);
        const maiorNumero = mesas.length ? Math.max(...mesas.map((m) => m.numero)) : 0;
        const novasMesas = Array.from({ length: quantidade }, (_, i) => ({
            id: `nova-${Date.now()}-${i}`,
            numero: maiorNumero + i + 1,
            tipo: tableType.value,
            status: "livre",
            nova: true,
        }));
        setMesas((prev) => [...prev, ...novasMesas]);
        resetForm();
    };

    const handleSubmitAsync = async () => {
        const novas = mesas.filter((m) => m.nova);
        if (!novas.length) {
            notify("Nenhuma nova mesa para salvar.", "info");
            return;
        }

        try {
            for (const mesa of novas) {
                const qrCodeUrl = `${window.location.origin}/mesa/${mesa.numero}`;
                await create(idRestaurante, "mesas", {
                    numero: mesa.numero,
                    tipo: mesa.tipo,
                    status: mesa.status,
                    criadoEm: serverTimestamp(),
                    qrCodeUrl,
                });
            }
            notify("Mesas salvas com sucesso!", "success");
            onClose();
        } catch (error) {
            console.error(error);
            notify("Erro ao salvar mesas", "error");
        }
    };


    const handleDeleteMesa = async (mesa) => {
        if (mesa.nova) {
            setMesas((prev) => prev.filter((m) => m.id !== mesa.id));
        } else {
            try {
                await remove(idRestaurante, "mesas", mesa.id);
                setMesas((prev) => prev.filter((m) => m.id !== mesa.id));
                notify("Mesa excluída com sucesso", "success");
            } catch (error) {
                console.error(error);
                notify("Erro ao excluir mesa", "error");
            }
        }
    };


    return {
        mesas,
        loading,
        tableType,
        qtd,
        setTableType,
        setQtd,
        handleAdd,
        handleSubmitAsync,
        handleDeleteMesa,
    };

};
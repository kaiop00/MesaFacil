import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { useState } from "react";
import { Settings } from "react-coolicons";
import CategoriasTable from "../CategoriasConfig/CategoriasTable";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import useCrudCategorias from "../../hooks/useCrudCategorias";
import CategoriaForm from "../CategoriasConfig/CategoriaForm";
import { useTranslation } from "react-i18next";

export default function CategoriaConfigModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const { idRestaurante } = useAuth();
    const { notify } = useToast();
    const [name, setName] = useState("");

    const {
        categorias,
        isListening,   
        isSending,     
        deletingIds,   
        addCategoria,
        deleteCategoria,
    } = useCrudCategorias({ idRestaurante, enabled: isOpen });

    async function handleCreate(nome) {
        try {
            await addCategoria(nome);
            setName("");
            notify(t("config:modals.categories.success.created"), "success");
        } catch (e) {
            console.error(e);
            notify(t("config:modals.categories.error.create"), "error");
        }
    }

    async function handleDelete(categoria) {
        try {
            await deleteCategoria(categoria.id);
            notify(t("config:modals.categories.success.deleted"), "success");
        } catch (e) {
            console.error(e);
            notify(t("config:modals.categories.error.delete"), "error");
        }
    }

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title={t("config:modals.categories.title")}
            subTitle={t("config:modals.categories.subtitle")}
            icon={Settings}
        >
            <CategoriaForm
                value={name}
                onChange={setName}
                onSubmit={handleCreate}
                loading={isSending}   
            />

            <CategoriasTable
                categorias={categorias}
                loading={isListening} 
                deletingIds={deletingIds}
                onDelete={handleDelete}
            />
        </BaseModalWithHeader>
    );
}

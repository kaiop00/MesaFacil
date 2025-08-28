import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { useState } from "react";
import { Settings } from "react-coolicons";
import CategoriasTable from "../CategoriasConfig/CategoriasTable";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import useCrudCategorias from "../../hooks/useCrudCategorias";
import CategoriaForm from "../CategoriasConfig/CategoriaForm";

export default function CategoriaConfigModal({ isOpen, onClose }) {
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
            notify("Categoria cadastrada com sucesso", "success");
        } catch (e) {
            console.error(e);
            notify("Erro ao cadastrar categoria", "error");
        }
    }

    async function handleDelete(categoria) {
        try {
            await deleteCategoria(categoria.id);
            notify("Categoria deletada com sucesso", "success");
        } catch (e) {
            console.error(e);
            notify("Erro ao deletar categoria", "error");
        }
    }

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title="Categorias"
            subTitle="Gerencie as Categorias do cardápio"
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

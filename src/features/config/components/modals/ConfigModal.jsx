import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { Coffee } from "react-coolicons";
import MesaForm from "@/features/config/components/MesaForm";
import MesaTable from "@/features/config/components/MesaTable";
import MesaActions from "@/features/config/components/MesaActions";
import { useCrudTables } from "@/features/config/hooks/useCrudTables";
import { useState } from "react";

const ConfigModal = ({ isOpen, onClose }) => {
    const {
        mesas,
        loading,
        tableType,
        qtd,
        setTableType,
        setQtd,
        handleAdd,
        handleSubmitAsync,
        handleDeleteMesa,
    } = useCrudTables({ isOpen, onClose });


    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        setSaving(true);
        await handleSubmitAsync();
        setSaving(false);
    };

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title="Configurações"
            subTitle="Gerencie as configurações do Sistema"
            icon={Coffee}
        >
            <div className="p-6 space-y-4 min-h-[200px] flex flex-col justify-center">
                {loading || saving ? (
                    <div className="flex justify-center items-center h-full py-12">
                        <div className="w-6 h-6 border-2 border-[#D9A23B] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        <MesaForm
                            tableType={tableType}
                            qtd={qtd}
                            setTableType={setTableType}
                            setQtd={setQtd}
                            onAdd={handleAdd}
                        />
                        <MesaActions />
                        <MesaTable mesas={mesas} loading={false} onDelete={handleDeleteMesa} />
                    </>
                )}
            </div>

            <div className="font-inter flex justify-between items-center px-6 py-4">
                <button
                    onClick={onClose}
                    className="cursor-pointer font-bold text-[#334155] px-4 py-2 rounded bg-[#F1F5F9] hover:bg-gray-100"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={saving || loading}
                    className="cursor-pointer font-bold bg-[#D9A23B] text-white px-6 py-2 rounded hover:bg-yellow-600 disabled:opacity-70"
                >
                    {saving ? "Salvando..." : "Salvar"}
                </button>
            </div>
        </BaseModalWithHeader>
    );
};

export default ConfigModal;

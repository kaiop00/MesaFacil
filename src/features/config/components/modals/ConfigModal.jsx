import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { Coffee } from "react-coolicons";
import MesaForm from "@/features/config/components/mesasConfig/MesaForm";
import MesaTable from "@/features/config/components/mesasConfig/MesaTable";
import MesaActions from "@/features/config/components/mesasConfig/MesaActions";
import LimitCounter from "@/components/LimitCounter";
import { useCrudTables } from "@/features/config/hooks/useCrudTables";
import { useState } from "react";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { QrCodeModal } from "./QrCodeModal";
import { FEATURE_FLAGS } from "@/constants/planFeatures";
import { useTranslation } from "react-i18next";

const ConfigModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
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


    const [mesaSelecionada, setMesaSelecionada] = useState(null);
    const [modalAberto, setModalAberto] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        setSaving(true);
        await handleSubmitAsync();
        setSaving(false);
    };

    const handleAbrirQRcode = (mesa) => {
        setMesaSelecionada(mesa);
        setModalAberto(true);
    }

    const handleFecharModal = () => {
        setModalAberto(false);
        setMesaSelecionada(null);
    }

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title={t("config:modals.tables.title")}
            subTitle={t("config:modals.tables.subtitle")}
            icon={Coffee}
        >
            <div className="p-6 space-y-4 min-h-[200px] flex flex-col justify-center">
                {loading || saving ? (
                    <div className="flex justify-center items-center h-full py-12">
                        <LoadingSpinnerDynamic />
                    </div>
                ) : (
                    <>
                        {/* Table Limit Counter */}
                        <LimitCounter
                            limitType="maxTables"
                            currentCount={mesas.length}
                            label="Mesas Cadastradas"
                            featureFlag={FEATURE_FLAGS.UNLIMITED_TABLES}
                            showUpgradeLink={true}
                        />
                        
                        <MesaForm
                            tableType={tableType}
                            qtd={qtd}
                            setTableType={setTableType}
                            setQtd={setQtd}
                            onAdd={handleAdd}
                        />
                        <MesaActions />
                        <MesaTable
                            mesas={mesas}
                            loading={false}
                            onDelete={handleDeleteMesa}
                            onQrCodeClick={handleAbrirQRcode}
                        />
                        <QrCodeModal
                            isOpen={modalAberto}
                            onClose={handleFecharModal}
                            mesa={mesaSelecionada}
                        />
                    </>
                )}
            </div>

            <div className="font-inter flex justify-between items-center px-6 py-4">
                <button
                    onClick={onClose}
                    className="cursor-pointer font-bold text-[#334155] px-4 py-2 rounded bg-[#F1F5F9] hover:bg-gray-100"
                >
                    {t("config:modals.tables.buttons.cancel")}
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={saving || loading}
                    className="cursor-pointer font-bold bg-[#D9A23B] text-white px-6 py-2 rounded hover:bg-yellow-600 disabled:opacity-70"
                >
                    {saving ? t("config:modals.tables.buttons.saving") : t("config:modals.tables.buttons.save")}
                </button>
            </div>
        </BaseModalWithHeader>
    );
};

export default ConfigModal;

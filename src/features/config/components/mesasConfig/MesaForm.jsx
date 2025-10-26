import TableType from "@/features/config/components/mesasConfig/TableType";
import { useTranslation } from "react-i18next";

const MesaForm = ({ tableType, qtd, setTableType, setQtd, onAdd }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col justify-between md:flex-row md:items-end md:space-x-4 space-y-3 md:space-y-0">
            <div className="w-full md:w-1/2">
                <TableType value={tableType} onChange={setTableType} />
            </div>
            <div className="w-full md:w-1/4">
                <label className="block mb-1 font-medium text-gray-700">{t("config:components.mesaForm.quantity")}</label>
                <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:border-amber-500"
                    placeholder={t("config:components.mesaForm.quantityPlaceholder")}
                    value={qtd}
                    onChange={(e) => setQtd(e.target.value)}
                    min={1}
                />
            </div>
            <div className="md:w-auto">
                <button
                    onClick={onAdd}
                    className="bg-[#D9A23B] hover:bg-yellow-600 text-white font-medium px-4 py-2 rounded-md w-full cursor-pointer"
                >
                    {t("config:components.mesaForm.includeButton")}
                </button>
            </div>
        </div>
    );
};

export default MesaForm;
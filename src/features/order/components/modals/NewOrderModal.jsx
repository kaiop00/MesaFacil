// src/features/order/components/modals/NewOrderModal.jsx

import { useState, useEffect } from "react";
import { SearchMagnifyingGlass, House02 } from "react-coolicons";
import { useTranslation } from "react-i18next";
import { useTables } from "@/features/config/hooks/useTables";
import { useOrderContext } from "@/features/order/context/OrderContext";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";

const NewOrderModal = ({ isOpen, onClose, openAddItemsModal }) => {
    const { t } = useTranslation('order');
    const { mesas } = useTables();
    const { setSelectedTable } = useOrderContext();
    const [selectedTableLocal, setSelectedTableLocal] = useState(null);

    const handleContinue = () => {
        if (selectedTableLocal) {
            setSelectedTable(selectedTableLocal);
            openAddItemsModal(selectedTableLocal);
            onClose();
        }
    };

    useEffect(() => {
        if(!isOpen){
            setSelectedTableLocal(null);
        }
    }, [isOpen]);

    const getStatusColor = (status) => {
        switch (status) {
            case "livre":
                return "text-green-500 bg-green-50";
            case "andamento":
                return "text-yellow-500 bg-yellow-50";
            case "entregue":
                return "text-red-500 bg-red-50";
            default:
                return "color-#D9A23B";
        }
    }

    return (
        <BaseModalWithHeader
            isOpen={!!isOpen}
            onClose={onClose}
            title={t('modals.newOrder.title')}
            subTitle="Preencha as informações e adicione um novo pedido"
        >
            <div className="font-inter">
                <h3 className="font-medium mb-4 text-lg">{t('modals.newOrder.selectTable')}</h3>

                {/* Campo de busca */}
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchMagnifyingGlass className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder={t('page.searchTables')}
                        className="w-full pl-10 pr-4 py-2 border rounded-md text-sm border-gray-300 focus:outline-none focus:border-primary-dynamic"
                    />
                </div>

                {/* Lista de mesas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                    {mesas.map((mesa) => (
                        <button
                            key={mesa.id}
                            onClick={() => setSelectedTableLocal(mesa)}
                            className={`cursor-pointer border rounded p-4 flex flex-col items-center space-y-2 transition-all
                                 ${selectedTableLocal?.id === mesa.id
                                    ? "border-primary-dynamic bg-primary-dynamic text-white"
                                    : "hover:border-primary-dynamic"
                                }`}
                        >
                            <House02 className={`h-10 w-10 p-2 rounded ${getStatusColor(mesa.status)}`}/>
                            <span>{t('tables.tableLetter', { letter: mesa.numero })}</span>
                        </button>
                    ))}
                </div>

                {/* Ações */}
                <div className="flex justify-between gap-2">
                    <button
                        className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer"
                        onClick={onClose}
                    >
                        {t('modals.newOrder.buttons.cancel')}
                    </button>
                    <button
                        disabled={!selectedTableLocal}
                        onClick={handleContinue}
                        className="px-4 py-2 bg-primary-dynamic text-white rounded disabled:bg-gray-300 cursor-pointer"
                    >
                        {t('modals.newOrder.buttons.create')}
                    </button>
                </div>
            </div>
        </BaseModalWithHeader>
    );
};

export default NewOrderModal;

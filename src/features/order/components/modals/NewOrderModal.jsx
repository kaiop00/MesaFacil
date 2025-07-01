// /features/order/components/modals/NewOrderModal.jsx

import { Dialog, DialogPanel } from "@headlessui/react";
import { useEffect, useRef, useState } from "react";
import { CloseLg, SearchMagnifyingGlass } from "react-coolicons";
import logo from "@/assets/images/order/TableYellow.png";
import { useTables } from "@/features/config/hooks/useTables";
import { useOrderContext } from "@/features/order/context/OrderContext";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";

const NewOrderModal = ({ isOpen, onClose, openAddItemsModal }) => {
    const { mesas } = useTables();
    const { setSelectedTable } = useOrderContext();
    const [selectedTableLocal, setSelectedTableLocal] = useState(null);
    const modalRef = useRef();

    const handleContinue = () => {
        if (selectedTableLocal) {
            setSelectedTable(selectedTableLocal);
            onClose();
            openAddItemsModal();
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    return (
        <BaseModalWithHeader
            isOpen={!!isOpen}   // ✅ alinhado com o que o BaseModal espera
            onClose={onClose}
            title="Novo Pedido"
            subTitle="Preencha as informações e adicione um novo pedido"
        >

            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel
                    ref={modalRef}
                    className="w-full max-w-4xl overflow-y-auto rounded bg-white shadow-xl flex flex-col"
                >
                    <div className="bg-primary-dynamic text-white px-4 py-3 flex justify-between items-center rounded-t">
                        <div>
                            <h2 className="font-semibold text-lg">Novo Pedido</h2>
                            <p className="text-sm">Preencha as informações e adicione um novo pedido</p>
                        </div>
                        <button onClick={onClose}>
                            <CloseLg />
                        </button>
                    </div>

                    <div className="p-6">
                        <h3 className="font-medium mb-4 text-lg">Selecione uma mesa para continuar</h3>
                        <div className="relative mb-4">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchMagnifyingGlass className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar"
                                className="w-full pl-10 pr-4 py-2 border rounded-md text-sm border-gray-300 focus:outline-none focus:border-primary-dynamic"
                            />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                            {mesas.map((mesa) => (
                                <button
                                    key={mesa.id}
                                    onClick={() => setSelectedTableLocal(mesa)}
                                    className={`border rounded p-4 flex flex-col items-center space-y-2 transition-all ${selectedTableLocal?.id === mesa.id
                                        ? "border-primary-dynamic bg-primary-dynamic text-white"
                                        : "hover:border-primary-dynamic"
                                        }`}
                                >
                                    <img src={logo} className="h-6 sm:h-10" alt="Mesa" />
                                    <span>Mesa {mesa.numero}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-between gap-2">
                            <button
                                className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                                onClick={onClose}
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={!selectedTableLocal}
                                onClick={handleContinue}
                                className="px-4 py-2 bg-primary-dynamic text-white rounded disabled:bg-gray-300"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                </DialogPanel>
            </div>
        </BaseModalWithHeader>
    );
};

export default NewOrderModal;

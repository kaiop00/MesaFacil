import { Dialog, DialogPanel } from "@headlessui/react";
import { useEffect, useRef, useState } from "react";
import { CloseLg, SearchMagnifyingGlass } from "react-coolicons";
import logo from "@/assets/images/order/TableYellow.png";

// Lista de mesas simuladas
const mesas = Array.from({ length: 15 }, (_, i) => `Mesa ${String(i + 1).padStart(2, "0")}`);

const NewOrderModal = ({ isOpen, onClose }) => {
    const [selectedTable, setSelectedTable] = useState("");
    const modalRef = useRef();

    const handleContinue = () => {
        if (selectedTable) {
            console.log("Mesa selecionada:", selectedTable);
            onClose();
        }
    };

    // Fecha o modal ao clicar fora
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
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* Fundo escuro */}
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            {/* Conteúdo central do modal */}
            <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
                <DialogPanel
                    ref={modalRef}
                    className="w-full h-full sm:h-auto sm:max-w-4xl overflow-y-auto rounded bg-white shadow-xl flex flex-col"
                >
                    {/* Cabeçalho */}
                    <div className="bg-[#D9A23B] font-inter text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center rounded-t">
                        <div>
                            <h2 className="font-semibold text-lg">Novo Pedido</h2>
                            <p className="text-sm hidden sm:block">Preencha as informações e adicione um novo pedido</p>
                        </div>
                        <button onClick={onClose} className="p-1 cursor-pointer">
                            <CloseLg />
                        </button>
                    </div>

                    {/* Conteúdo principal */}
                    <div className="font-inter px-4 py-4 sm:px-6 sm:py-6 flex-1 overflow-y-auto">
                        {/* Título */}
                        <h3 className="font-medium mb-4 ml-0.5 text-base sm:text-lg">
                            Selecione uma mesa para continuar
                        </h3>

                        {/* Campo de busca */}
                        <div className="font-inter relative mb-4">
                            {/* Ícone da lupa */}
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchMagnifyingGlass className="w-5 h-5 text-gray-400" />
                            </div>

                            {/* Campo de busca */}
                            <input
                                type="text"
                                placeholder="Buscar"
                                className="w-full pl-10 pr-4 py-2 border rounded-md text-sm transition-colors
                                border-[#D2DBE4] focus:outline-none focus:ring-.5 focus:ring-[#D9A23B] focus:border-[#D9A23B]"
                                style={{ borderRadius: "8px" }}
                            />
                        </div>

                        {/* Grade de mesas */}
                        <div className="font-inter font-bold grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6 mt-5">
                            {mesas.map((mesa) => (
                                <button
                                    key={mesa}
                                    onClick={() => setSelectedTable(mesa)}
                                    className={`border border-[#DEE4EA] rounded p-4 flex flex-col items-center justify-center space-y-2 transition-all ${selectedTable === mesa
                                        ? "border-[#D9A23B] bg-[#D9A23B] text-white"
                                        : "hover:border-[#D9A23B]"
                                        }`}
                                >
                                    <img
                                        src={logo}
                                        className="h-6 sm:h-10"
                                        alt="Mesa"
                                    />
                                    <span className="text-sm sm:text-base">{mesa}</span>
                                </button>
                            ))}
                        </div>

                        {/* Ações */}
                        <div className="flex flex-col sm:flex-row justify-between gap-2">
                            <button
                                className="font-inter w-full sm:w-auto px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-[#334155] cursor-pointer"
                                onClick={onClose}
                            >
                                Cancelar
                            </button>
                            <button
                                className="font-inter w-full sm:w-auto px-4 py-2 bg-[#D9A23B] text-white rounded hover:bg-yellow-700 disabled:bg-[#F1F5F9] disabled:text-[#334155] disabled:cursor-default cursor-pointer"
                                disabled={!selectedTable}
                                onClick={handleContinue}
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
};

export default NewOrderModal;

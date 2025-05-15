import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { CloseLg } from "react-coolicons";

const DetailOrderModal = ({ isOpen, onClose, order }) => {
    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* fundo escuro */}
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            {/* conteúdo central */}
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="w-full max-w-2xl rounded-lg bg-white shadow-xl overflow-hidden">
                    {/* Cabeçalho */}
                    <div className="font-inter flex justify-between items-center px-6 py-4 bg-[#D9A23B]">
                        <div>
                            <DialogTitle className="text-white text-lg font-semibold">
                                Detalhes do Pedido
                            </DialogTitle>
                            <p className="text-white text-sm">Relação de dados cadastrados</p>
                        </div>
                        <button onClick={onClose}>
                            <CloseLg className="text-white cursor-pointer"/>
                        </button>
                    </div>

                    {/* Corpo */}
                    <div className="pt-[32px] pb-[24px] px-[28px] space-y-4 font-inter">
                        <div>
                            <p className="font-semibold text-sm text-gray-800">Pedido</p>
                            <p className="text-gray-600 text-sm">Pedido Nº {order?.id || "1231"}</p>
                        </div>

                        <div>
                            <p className="font-semibold text-sm text-gray-800 mb-2">Itens</p>
                            {order?.items?.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                                    <div className="flex items-center space-x-3">
                                        <img src={item.image} alt={item.name} className="w-14 h-14 rounded object-cover" />
                                        <div>
                                            <p className="font-medium text-gray-800 text-sm">
                                                {item.quantity}x - {item.name}
                                            </p>
                                            <p className="text-sm text-gray-600">R$ {item.price}</p>
                                        </div>
                                    </div>
                                    <span className="text-gray-500">▼</span>
                                </div>
                            ))}
                        </div>

                        <div>
                            <p className="font-semibold text-sm text-gray-800">Observações</p>
                            <p className="text-gray-600 text-sm">{order?.observations || "Exemplo de Observações"}</p>
                        </div>
                    </div>

                    {/* Rodapé */}
                    <div className="font-inter flex justify-between items-center px-6 py-4">
                        <button onClick={onClose} className="cursor-pointer font-bold text-[#334155] px-4 py-2 rounded bg-[#F1F5F9] hover:bg-gray-100">
                            Cancelar
                        </button>
                        <button className="cursor-pointer font-bold bg-[#D9A23B] text-white px-6 py-2 rounded hover:bg-yellow-600">
                            Opções
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}

export default DetailOrderModal;
import { ChevronLeft } from "react-coolicons";
import { useState } from "react";

export default function ItemModal({ item, onClose, onAdicionar }) {
    const [quantidade, setQuantidade] = useState(1);

    const aumentar = () => setQuantidade((q) => q + 1);
    const diminuir = () => setQuantidade((q) => Math.max(1, q - 1));

    const total = (item.valor ?? 0) * quantidade;

    return (
        <div className="fixed inset-0 z-[999] bg-white overflow-auto pb-28">
            {/* Header + imagem */}
            <div className="mt-5">
                <div className="absolute flex items-center justify-center top-13 left-5 bg-white w-10 h-10 rounded-full cursor-pointer">
                    <button onClick={onClose}>
                        <ChevronLeft />
                    </button>
                </div>
                <img
                    src={item.imagemUrl}
                    alt={item.nome}
                    className="w-full h-64 object-cover mb-6"
                />
            </div>

            {/* Informações */}
            <div className="p-5 flex flex-col gap-6">
                <div>
                    <p className="text-[#D9A23B] font-semibold mb-1">R$ {item.valor.toFixed(2).replace('.', ',')}</p>
                    <h1 className="text-2xl font-bold mb-1">{item.nome}</h1>
                    <p className="text-gray-600 text-base">{item.descricao}</p>
                </div>

                {Array.isArray(item.alergias) && item.alergias.length > 0 && (
                    <div>
                        <h2 className="text-2xl mb-1">Alergias</h2>
                        <div className="flex flex-row flex-wrap gap-2">
                            {item.alergias.map((alergia) => (
                                <div key={alergia} className="flex px-3 h-8 bg-[#F1F5F9] items-center justify-center rounded">
                                    <p className="text-sm">{alergia}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Rodapé */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-3 pb-10 flex items-center justify-between shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50">
                {/* Contador */}
                <div className="flex items-center gap-4">
                    <button onClick={diminuir} className="text-[#D9A23B] text-xl font-bold">−</button>
                    <span className="text-lg font-medium">{quantidade}</span>
                    <button onClick={aumentar} className="text-[#D9A23B] text-xl font-bold">+</button>
                </div>

                {/* Botão adicionar */}
                <button
                    onClick={() => onAdicionar({ ...item, quantidade })}
                    className="bg-[#D9A23B] text-white font-medium px-4 py-2 rounded-md hover:opacity-90 transition flex items-center gap-3"
                >
                    Adicionar
                    <span className="font-semibold">{total.toFixed(2).replace('.', ',')}</span>
                </button>
            </div>
        </div>
    );
}

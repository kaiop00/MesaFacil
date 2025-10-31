import { ChevronLeft } from "react-coolicons";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function ItemModal({ item, onClose, onAdicionar }) {
    const { t } = useTranslation("cliente");
    const [quantidade, setQuantidade] = useState(1);
    const temPromocao = item.temPromocao && item.promocao;

    const aumentar = () => setQuantidade((q) => q + 1);
    const diminuir = () => setQuantidade((q) => Math.max(1, q - 1));

    const total = (item.valor ?? 0) * quantidade;

    return (
        <div className="fixed inset-0 z-[999] bg-white overflow-auto pb-28">
            {/* Header + imagem */}
            <div className="mt-5 relative">
                <div className="absolute flex items-center justify-center top-13 left-5 bg-white w-10 h-10 rounded-full cursor-pointer z-10">
                    <button onClick={onClose}>
                        <ChevronLeft />
                    </button>
                </div>
                
                {/* Badge de promoção na imagem */}
                {temPromocao && (
                    <div className="absolute top-8 right-5 bg-red-500 text-white text-sm px-3 py-1 rounded-lg font-bold z-10">
                        {t("cardapio.promotion")} -{item.promocao.porcentagemDesconto}%
                    </div>
                )}
                
                <img
                    src={item.imagemUrl}
                    alt={item.nome}
                    className="w-full h-64 object-cover mb-6"
                />
            </div>

            {/* Informações */}
            <div className="p-5 flex flex-col gap-6">
                <div>
                    {/* Preços - com ou sem promoção */}
                    <div className="flex items-center gap-3 mb-3">
                        {temPromocao ? (
                            <>
                                <p className="text-[#D9A23B] font-bold text-xl">
                                    R$ {item.valor.toFixed(2).replace('.', ',')}
                                </p>
                                <p className="text-gray-400 text-lg line-through">
                                    R$ {item.valorOriginal.toFixed(2).replace('.', ',')}
                                </p>
                                <span className="bg-green-500 text-white text-sm px-2 py-1 rounded-full font-medium">
                                    {t("cardapio.save")} R$ {(item.valorOriginal - item.valor).toFixed(2).replace('.', ',')}
                                </span>
                            </>
                        ) : (
                            <p className="text-[#D9A23B] font-semibold text-xl">
                                R$ {item.valor.toFixed(2).replace('.', ',')}
                            </p>
                        )}
                    </div>

                    {/* Nome da promoção */}
                    {temPromocao && item.promocao.nome && (
                        <div className="mb-3">
                            <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full border border-yellow-300 font-medium">
                                🎉 {item.promocao.nome}
                            </span>
                        </div>
                    )}

                    <h1 className="text-2xl font-bold mb-1">{item.nome}</h1>
                    <p className="text-gray-600 text-base">{item.descricao}</p>
                </div>

                {Array.isArray(item.alergias) && item.alergias.length > 0 && (
                    <div>
                        <h2 className="text-2xl mb-1">{t("itemModal.allergies")}</h2>
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
                    {t("itemModal.add")}
                    <span className="font-semibold">R$ {total.toFixed(2).replace('.', ',')}</span>
                </button>
            </div>
        </div>
    );
}

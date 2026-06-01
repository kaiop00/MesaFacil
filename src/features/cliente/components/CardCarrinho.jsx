import { useEffect, useState } from "react";

export default function CardCarrinho({ item, onIncrement, onDecrement, onUpdateObservation }) {
    const temPromocao = item.temPromocao && item.promocao;
    const currentObservation = item.itemObservation || item.observacao || "";
    const [observationDraft, setObservationDraft] = useState(currentObservation);
    const updateObservation = typeof onUpdateObservation === "function" ? onUpdateObservation : () => {};

    useEffect(() => {
        setObservationDraft(currentObservation);
    }, [currentObservation]);
    
    return (
        <div
            className="
        flex flex-row items-center gap-4 bg-white border-b border-gray-100 p-2
        md:rounded-lg md:shadow-sm
      "
        >
            <div className="relative w-20 h-20 flex-shrink-0 md:w-24 md:h-24">
                {/* Badge de promoção no carrinho */}
                {temPromocao && (
                    <div className="absolute -top-1 -left-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold z-10">
                        -{item.promocao.porcentagemDesconto}%
                    </div>
                )}
                <img
                    src={item.imagemUrl}
                    alt={item.nome}
                    className="w-full h-full object-cover rounded-md"
                />
            </div>

            <div className="flex flex-col flex-1">
                <p className="font-semibold text-gray-800 text-sm md:text-base">{item.nome}</p>
                <p className="text-sm text-gray-500 line-clamp-1">{item.categorias}</p>
                
                {/* Preços com promoção */}
                <div className="flex items-center gap-2 mt-1">
                    {temPromocao ? (
                        <>
                            <p className="text-[#D9A23B] font-bold text-sm md:text-base">
                                R$ {item.price.toFixed(2).replace('.', ',')}
                            </p>
                            <p className="text-gray-400 text-xs line-through">
                                R$ {item.valorOriginal.toFixed(2).replace('.', ',')}
                            </p>
                        </>
                    ) : (
                        <p className="text-[#D9A23B] font-semibold text-sm md:text-base">
                            R$ {(item.price || item.valor).toFixed(2).replace('.', ',')}
                        </p>
                    )}
                </div>

                {/* Nome da promoção no carrinho */}
                {temPromocao && item.promocao.nome && (
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full mt-1 self-start">
                        {item.promocao.nome}
                    </span>
                )}

                {currentObservation && (
                    <p className="mt-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                        Observação: {currentObservation}
                    </p>
                )}

                <div className="mt-3 rounded-lg border border-dashed border-[#D9A23B]/30 bg-amber-50 p-3">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Observação deste item
                    </label>
                    <p className="mb-2 text-[11px] text-amber-800/80">
                        Vale só para este produto. Ex.: gelo e limão na Coca, sem cebola no crepe.
                    </p>
                    <textarea
                        data-cartid={item.cartItemId || item.id}
                        value={observationDraft}
                        onChange={(e) => {
                            const value = e.target.value;
                            setObservationDraft(value);
                            updateObservation(item.cartItemId || item.id, value);
                        }}
                        onBlur={() => updateObservation(item.cartItemId || item.id, observationDraft)}
                        placeholder="Ex: gelo e limão, sem cebola, pouco sal..."
                        className="w-full min-h-24 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#D9A23B] focus:ring-1 focus:ring-[#D9A23B]"
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setObservationDraft("");
                                updateObservation(item.cartItemId || item.id, "");
                            }}
                            className="rounded-md border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:border-amber-300 hover:bg-amber-100"
                        >
                            Limpar
                        </button>
                        <button
                            type="button"
                            onClick={() => updateObservation(item.cartItemId || item.id, observationDraft)}
                            className="rounded-md bg-[#D9A23B] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 bg-[#F8FAFC] rounded px-2 py-1">
                <button
                    type="button"
                    onClick={() => onDecrement?.(item)}
                    className="text-[#D9A23B] text-lg font-bold"
                >
                    −
                </button>
                <span className="text-sm font-medium min-w-[16px] text-center">
                    {item.quantity ?? item.quantidade ?? 1}
                </span>
                <button
                    type="button"
                    onClick={() => onIncrement?.(item)}
                    className="text-[#D9A23B] text-lg font-bold"
                >
                    +
                </button>
            </div>
        </div>
    );
}

export default function CardCarrinho({ item, onIncrement, onDecrement }) {
    const temPromocao = item.temPromocao && item.promocao;
    const currentObservation = item.itemObservation || item.observacao || "";
    const precoAtual = Number(item.price ?? item.valor ?? 0);
    const precoOriginal = Number(item.valorOriginal ?? item.valor ?? item.price ?? 0);
    const precoAtualFormatado = Number.isFinite(precoAtual) ? precoAtual : 0;
    const precoOriginalFormatado = Number.isFinite(precoOriginal) ? precoOriginal : 0;
    
    return (
        <div
            className="
        flex flex-col gap-4 bg-white border-b border-gray-100 p-3
        md:flex-row md:items-center md:gap-4 md:rounded-lg md:shadow-sm
      "
        >
            <div className="relative h-20 w-20 flex-shrink-0 self-start md:h-24 md:w-24">
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

            <div className="flex min-w-0 flex-1 flex-col">
                <p className="font-semibold text-gray-800 text-sm md:text-base">{item.nome}</p>
                <p className="text-sm text-gray-500 line-clamp-1">{item.categorias}</p>
                
                {/* Preços com promoção */}
                <div className="flex items-center gap-2 mt-1">
                    {temPromocao ? (
                        <>
                            <p className="text-[#D9A23B] font-bold text-sm md:text-base">
                                R$ {precoAtualFormatado.toFixed(2).replace('.', ',')}
                            </p>
                            <p className="text-gray-400 text-xs line-through">
                                R$ {precoOriginalFormatado.toFixed(2).replace('.', ',')}
                            </p>
                        </>
                    ) : (
                        <p className="text-[#D9A23B] font-semibold text-sm md:text-base">
                            R$ {precoAtualFormatado.toFixed(2).replace('.', ',')}
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

            </div>

            <div className="flex items-center justify-between gap-3 rounded bg-[#F8FAFC] px-2 py-1 self-end md:self-auto">
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

export default function CardCarrinho({ item, onIncrement, onDecrement }) {
    const temPromocao = item.temPromocao && item.promocao;
    
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
            </div>

            <div className="flex items-center gap-3 bg-[#F8FAFC] rounded px-2 py-1">
                <button
                    // onClick={() => onDecrement?.(item)}
                    className="text-[#D9A23B] text-lg font-bold"
                >
                    −
                </button>
                <span className="text-sm font-medium min-w-[16px] text-center">
                    {item.quantity ?? item.quantidade ?? 1}
                </span>
                <button
                    // onClick={() => onIncrement?.(item)}
                    className="text-[#D9A23B] text-lg font-bold"
                >
                    +
                </button>
            </div>
        </div>
    );
}

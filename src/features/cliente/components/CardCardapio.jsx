export default function CardCardapio({ item, onClick, onAddCarrinho }) {
    const temPromocao = item.temPromocao && item.promocao;
    
    return (
        <div className="w-full h-full p-3 bg-white border-t border-b border-gray-100
                    md:rounded-xl md:border md:shadow-sm">
        <div className="flex items-start justify-between">
            <div className="flex flex-col flex-1 pr-3 cursor-pointer" onClick={onClick}>
                {/* Preços - com ou sem promoção */}
                    {temPromocao ? (
                        <div className="flex flex-col items-baseline gap-2 mb-1">
                            {/* Preço original riscado */}
                            <p className="text-gray-400 text-sm line-through">
                                R$ {item.valorOriginal.toFixed(2).replace('.', ',')}
                            </p>
                            {/* Preço promocional em destaque */}
                            <p className="text-[#D9A23B] font-bold text-lg md:text-xl">
                                R$ {item.valor.toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 mb-1">
                        <p className="text-[#D9A23B] font-semibold text-lg md:text-xl">
                            R$ {item.valor.toFixed(2).replace('.', ',')}
                        </p>
                        </div>
                    )}

                <p className="font-semibold text-gray-800 text-base md:text-lg">{item.nome}</p>
                <p className="text-gray-500 text-sm leading-snug line-clamp-2 md:line-clamp-3">{item.descricao}</p>

            </div>
                

            <div className="relative w-24 h-24 flex-shrink-0 md:w-28 md:h-28">
                {/* Badge de promoção na imagem */}
                {temPromocao && (
                    <div className="absolute top-0 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded-br-lg rounded-tl-lg font-bold z-10">
                        -{item.promocao.porcentagemDesconto}%
                    </div>
                )}
                
                <img
                    src={item.imagemUrl}
                    alt={item.nome}
                    className="w-full h-full rounded-lg object-cover md:rounded-xl"
                />
                <button
                    onClick={() => onAddCarrinho(item)}
                    className="absolute bottom-1 right-1 bg-white rounded-full shadow p-1 hover:scale-105 transition md:bottom-2 md:right-2"
                >
                    <span className="text-black text-lg leading-none p-2">+</span>
                </button>
            </div>
        </div>
            {/* Indicador de promoção */}
                {temPromocao && item.promocao.nome && (
                    <div className="mt-2">
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full border border-yellow-300">
                            🎉 {item.promocao.nome}
                        </span>
                    </div>
                )}
        </div>
    );
}

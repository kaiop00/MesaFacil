export default function CardCardapio({ item, onClick, onAddCarrinho }) {
    return (
        <div className="w-full flex items-start justify-between p-3 bg-white border-t border-b border-gray-100">
            <div className="flex flex-col flex-1 pr-3 cursor-pointer" onClick={onClick}>
                <p className="text-[#D9A23B] font-semibold text-lg">R$ {item.valor.toFixed(2).replace('.', ',')}</p>
                <p className="font-semibold text-gray-800 text-base">{item.nome}</p>
                <p className="text-gray-500 text-sm leading-snug line-clamp-2">{item.descricao}</p>
            </div>

            <div className="relative w-24 h-24 flex-shrink-0">
                <img
                    src={item.imagemUrl}
                    alt={item.nome}
                    className="w-full h-full rounded-lg object-cover"
                />
                <button
                    onClick={() => onAddCarrinho(item)}
                    className="absolute bottom-1 right-1 bg-white rounded-full shadow p-1 hover:scale-105 transition"
                >
                    <span className="text-black text-lg leading-none p-2">+</span>
                </button>
            </div>
        </div>
    );
}

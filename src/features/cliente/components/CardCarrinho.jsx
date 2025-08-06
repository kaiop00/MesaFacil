export default function CardCarrinho({ item, onIncrement, onDecrement }) {
    return (
        <div className="flex flex-row items-center gap-4 bg-white border-b border-gray-100">
            <img
                src={item.imagemUrl}
                alt={item.nome}
                className="w-20 h-20 object-cover rounded-md flex-shrink-0"
            />

            <div className="flex flex-col flex-1">
                <p className="font-semibold text-gray-800">{item.nome}</p>
                <p className="text-sm text-gray-500 line-clamp-1">{item.categorias}</p>
                <p className="text-[#D9A23B] font-semibold mt-1">R$ {item.valor.toFixed(2).replace('.', ',')}</p>
            </div>

            <div className="flex items-center gap-3 bg-[#F8FAFC] rounded px-2 py-1">
                <button
                    // onClick={() => onDecrement?.(item)}
                    className="text-[#D9A23B] text-lg font-bold"
                >
                    −
                </button>
                <span className="text-sm font-medium min-w-[16px] text-center">
                    {item.quantidade ?? 1}
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

export default function CardCardapio({item}) {
    return (
        <div className="w-full flex items-start justify-between p-3 bg-white border-t border-b border-gray-100">
            {/* Informações do prato */}
            <div className="flex flex-col flex-1 pr-3">
                <p className="text-[#D9A23B] font-semibold text-lg">R${item.valor}</p>
                <p className="font-semibold text-gray-800 text-base">{item.nome}</p>
                <p className="text-gray-500 text-sm leading-snug line-clamp-2">
                    {item.descricao}
                </p>
            </div>

            {/* Imagem + botão adicionar */}
            <div className="relative w-23 h-23 flex-shrink-0">
                <img
                    src={item.imagemUrl}
                    alt="Prato"
                    className="w-full h-full rounded-lg object-cover"
                />
                <button className="absolute bottom-1 right-1 bg-white rounded-full shadow p-1 hover:scale-105 transition">
                    <span className="text-black text-lg leading-none p-2">+</span>
                </button>
            </div>
        </div>
    )
}
import { ChevronLeft } from "react-coolicons"

export default function ItemModal({ item, onClose }) {

    return (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
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
            <div className="p-5 flex flex-col gap-6">
                <div>
                    <p className="text-[#D9A23B] font-semibold mb-1">R$ {item.valor}</p>
                    <h1 className="text-2xl font-bold mb-1">{item.nome}</h1>
                    <p className="text-gray-600 text-base">{item.descricao}</p>
                </div>
                {Array.isArray(item.alergias) && item.alergias.length > 0 && (
                    <div>
                        <h2 className="text-2xl mb-1">Alergias</h2>
                        <div className="flex flex-row gap-3">
                            {item.alergias.map((alergia) => (
                                <div className="flex w-25 h-8 bg-[#F1F5F9] items-center justify-center rounded">
                                    <p>{alergia}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

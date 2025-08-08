import { useCarrinho } from "../context/CarrinhoContext";
import { Navigate, useNavigate } from "react-router-dom";

export default function CarrinhoFooter({  }) {
    const { carrinhoItems, total, quantidade } = useCarrinho();
    const navigate = useNavigate();

    if (quantidade === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-3 pb-10 flex items-center justify-between shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50">
            <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-lg font-semibold text-gray-900">
                    R$ {total.toFixed(2).replace('.', ',')}
                    <span className="text-sm font-normal text-gray-500"> / {quantidade} item{quantidade !== 1 && 's'}</span>
                </p>
            </div>
            <button
                onClick={() => navigate("sacola")}
                className="bg-[#D9A23B] text-white font-medium px-4 py-2 rounded-md hover:opacity-90 transition"
            >
                Ver Sacola
            </button>
        </div>
    );
}

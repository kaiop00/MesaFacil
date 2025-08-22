import { useCarrinho } from "../context/CarrinhoContext";

export default function CarrinhoFooter() {
    const { total, quantidade } = useCarrinho();

    if (quantidade === 0) return null;

    return (
        <div
            className="
        fixed left-0 w-full
        bottom-18
        bg-white border-t border-gray-200
        px-4 py-3
        flex items-center justify-between
        shadow-[0_-2px_10px_rgba(0,0,0,0.05)]
        z-50
      "
        >
            <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-lg font-semibold text-gray-900">
                    R$ {total.toFixed(2).replace(".", ",")}
                    <span className="text-sm font-normal text-gray-500">
                        {" "} / {quantidade} item{quantidade !== 1 && "s"}
                    </span>
                </p>
            </div>
        </div>
    );
}

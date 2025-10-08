import { formatCurrency } from "../utils/pedidos";

const PaymentSummary = ({ items, loading, error, subtotal }) => {
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-3">
                <span className="flex-1 h-px bg-[#D9A23B]/30" />
                <span className="text-xs font-semibold text-[#D9A23B] tracking-widest uppercase">
                    Resumo da Compra
                </span>
                <span className="flex-1 h-px bg-[#D9A23B]/30" />
            </div>

            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                {loading && <p>Carregando pedidos...</p>}
                {!loading && error && <p className="text-red-500">{error}</p>}

                {!loading && !error && items.length === 0 && (
                    <p className="text-sm text-gray-500">Nenhum item disponível para pagamento no momento.</p>
                )}

                {!loading && !error && items.length > 0 && (
                    <ul className="space-y-2">
                        {items.map((item) => (
                            <li key={item.id} className="flex justify-between text-sm text-gray-700">
                                <span>
                                    {item.quantity > 1 ? `${item.quantity}x ` : ""}
                                    {item.nome}
                                </span>
                                <span>{formatCurrency(item.total)}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {!loading && !error && (
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3 font-semibold text-gray-900">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                )}
            </div>
        </section>
    );
};

export default PaymentSummary;

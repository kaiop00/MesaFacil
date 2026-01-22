export default function PedidoAndamentoInfo({ pedido, numeroMesa }) {
    const subtotal = pedido?.items?.reduce((acc, item) => {
        const valor = item.price ?? item.valor ?? 0;
        const qtd = item.quantity ?? item.quantidade ?? 1;
        return acc + valor * qtd;
    }, 0);

    // Verifica se há taxa de entrega aplicada
    const taxaEntrega = pedido?.taxaEntrega;
    const temTaxaEntrega = taxaEntrega?.aplicada && taxaEntrega?.valor > 0;
    const valorTaxaEntrega = temTaxaEntrega ? taxaEntrega.valor : 0;
    const total = subtotal + valorTaxaEntrega;

    return (
        <div className="bg-white rounded-xl shadow-md mt-6 px-6 py-4 w-full max-w-md text-sm text-gray-700 space-y-4">
            <div>
                <p className="font-bold text-gray-900 mb-2">Detalhes do Pedido</p>
                <p><span className="font-medium">Pedido</span> Pedido Nº {pedido.id}</p>
                <p><span className="font-medium">Mesa</span> {numeroMesa}</p>
            </div>

            <div>
                <p className="font-medium text-gray-800 mb-1">Itens</p>
                <ul className="space-y-1">
                    {pedido.items?.map((item, idx) => (
                        <li key={idx} className="flex justify-between">
                            <span>{item.nome}</span>
                            <span>
                                R$ {(item.price ?? item.valor ?? 0).toFixed(2).replace('.', ',')}
                            </span>
                        </li>
                    ))}
                </ul>
                <hr className="my-2" />
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {temTaxaEntrega && (
                    <div className="flex justify-between text-gray-600">
                        <span>Taxa de entrega</span>
                        <span>R$ {valorTaxaEntrega.toFixed(2).replace('.', ',')}</span>
                    </div>
                )}
                {temTaxaEntrega && (
                    <>
                        <hr className="my-2" />
                        <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </>
                )}
                {!temTaxaEntrega && (
                    <div className="flex justify-between font-semibold mt-1">
                        <span>Total</span>
                        <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                )}
            </div>

            {pedido.observacoes && (
                <div>
                    <p className="font-medium text-gray-800 mb-1">Observações</p>
                    <p>{pedido.observacoes}</p>
                </div>
            )}
        </div>
    );
}



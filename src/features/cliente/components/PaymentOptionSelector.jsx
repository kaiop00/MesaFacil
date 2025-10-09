const PaymentOptionSelector = ({ garcomDisabled, garcomSolicitado }) => {
    const showStatus = garcomSolicitado || garcomDisabled;
    const statusLabel = garcomSolicitado ? "Garçom a caminho" : "Chamando garçom...";
    const statusColor = garcomSolicitado ? "text-[#B7791F]" : "text-[#D97706]";

    return (
        <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Pagamento com atendimento</h3>

            <div
                className={`w-full border rounded-xl p-4 transition bg-white shadow-sm ${
                    garcomSolicitado ? "border-[#D9A23B] bg-[#FDF0D8]" : "border-gray-200"
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">Chamar Garçom</p>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            Toque em &quot;Chamar garçom&quot; para solicitar a presença do garçom e concluir o
                            pagamento diretamente na mesa.
                        </p>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Garçom</span>
                </div>

                {showStatus && (
                    <div className="mt-3 rounded-lg bg-gray-50 border border-dashed border-gray-200 p-3 text-xs text-gray-600">
                        <p className={`font-semibold ${statusColor}`}>Status: {statusLabel}</p>
                        {garcomSolicitado ? (
                            <p className="mt-1">
                                Aguarde um instante, o garçom já foi notificado e chegará à sua mesa em breve.
                            </p>
                        ) : (
                            <p className="mt-1">
                                Estamos acionando o garçom. Você receberá uma confirmação assim que o pedido for
                                concluído.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default PaymentOptionSelector;

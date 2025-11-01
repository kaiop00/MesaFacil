const PixPaymentCard = ({ visible, loading, error, qrCode, payload, copying, onCopy }) => {
    if (!visible) return null;

    return (
        <section className="space-y-3">
            <div className="border border-[#10B981]/40 rounded-xl p-4 bg-[#F0FDF4] text-center text-sm text-gray-700">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 flex items-center justify-center bg-white border border-[#10B981]/30 rounded-xl overflow-hidden">
                        {loading ? (
                            <span className="text-xs text-gray-500">Gerando QR Code...</span>
                        ) : qrCode ? (
                            <img src={qrCode} alt="QR Code Pix" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-xs text-red-500">
                                {error || "QR Code não disponível"}
                            </span>
                        )}
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs text-gray-600">
                            Abra o aplicativo do seu banco, escaneie o QR Code ou copie e cole o código Pix
                            no campo apropriado.
                        </p>
                        <p className="text-xs font-semibold text-[#D9A23B]">
                            Tempo de Expiração: <span className="font-bold">5 minutos</span>
                        </p>
                    </div>

                    {error && !loading && (
                        <p className="text-xs text-red-500">{error}</p>
                    )}

                    <button
                        type="button"
                        onClick={onCopy}
                        disabled={!payload || copying || loading}
                        className="w-full bg-[#D9A23B] text-white font-semibold py-3 rounded-xl shadow-sm hover:bg-[#c48f32] transition disabled:bg-[#D9A23B]/60"
                    >
                        {copying ? "Copiando..." : "Copiar QR Code"}
                    </button>

                    {payload && (
                        <div className="bg-white border border-dashed border-[#10B981]/40 rounded-lg p-3 text-left">
                            <p className="text-[11px] text-gray-500 break-all leading-relaxed">
                                {payload}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default PixPaymentCard;

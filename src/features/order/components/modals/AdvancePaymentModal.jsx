import { useState, useMemo } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { AddPlus } from "react-coolicons";
import { formatCurrency } from "@/features/cliente/utils/pedidos";

const AdvancePaymentModal = ({
  isOpen,
  onClose,
  onConfirm,
  mesaNumero,
  totalValue,
  currentAdvances = [],
  loading = false,
}) => {
  const [valorAdiantamento, setValorAdiantamento] = useState("");
  const [metodo, setMetodo] = useState("dinheiro");

  const totalValueNum = Number(totalValue || 0);
  const totalAdiantado = useMemo(
    () => currentAdvances.reduce((acc, adv) => acc + Number(adv.valor || 0), 0),
    [currentAdvances]
  );
  const saldoDevedor = useMemo(
    () => Math.max(0, totalValueNum - totalAdiantado),
    [totalValueNum, totalAdiantado]
  );

  const valorAdiantamentoNumerico = useMemo(() => {
    const valorNormalizado = String(valorAdiantamento || "")
      .trim()
      .replace(/\./g, "")
      .replace(/,/g, ".");

    if (!valorNormalizado) return null;
    const parsed = Number(valorNormalizado);
    return Number.isFinite(parsed) ? parsed : null;
  }, [valorAdiantamento]);

  const adiantamentoInvalido = useMemo(() => {
    if (valorAdiantamentoNumerico === null) return true;
    if (valorAdiantamentoNumerico <= 0) return true;
    if (valorAdiantamentoNumerico > saldoDevedor + 0.01) return true;
    return false;
  }, [valorAdiantamentoNumerico, saldoDevedor]);

  const handleAddAdvance = () => {
    if (adiantamentoInvalido) return;

    const novoAdiantamento = {
      valor: valorAdiantamentoNumerico,
      metodo,
      data: new Date().toISOString(),
    };

    onConfirm(novoAdiantamento);
    setValorAdiantamento("");
    setMetodo("dinheiro");
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title={`Adiantamento - Mesa ${mesaNumero}`}
      subTitle="Registre pagamentos parciais"
    >
      <div className="space-y-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Valor total:</span>
            <span className="font-semibold text-gray-800">
              {formatCurrency(totalValueNum)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Total adiantado:</span>
            <span className="font-semibold text-emerald-600">
              {formatCurrency(totalAdiantado)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-300">
            <span className="font-bold">Saldo devedor:</span>
            <span
              className={`font-bold text-lg ${
                saldoDevedor > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {formatCurrency(saldoDevedor)}
            </span>
          </div>
        </div>

        {currentAdvances.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Adiantamentos registrados:</h3>
            <div className="space-y-2">
              {currentAdvances.map((adv, idx) => (
                <div
                  key={adv.id || idx}
                  className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">
                      {adv.metodo === "dinheiro"
                        ? "Dinheiro"
                        : adv.metodo === "credito"
                        ? "Crédito"
                        : adv.metodo === "debito"
                        ? "Débito"
                        : adv.metodo === "pix"
                        ? "PIX"
                        : adv.metodo}
                    </p>
                    {adv.data && (
                      <p className="text-xs text-gray-500">
                        {new Date(adv.data).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(adv.valor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {saldoDevedor > 0 && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-gray-800">Novo adiantamento</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "dinheiro", label: "Dinheiro" },
                  { id: "credito", label: "Crédito" },
                  { id: "debito", label: "Débito" },
                  { id: "pix", label: "PIX" },
                ].map((opcao) => (
                  <button
                    key={opcao.id}
                    onClick={() => setMetodo(opcao.id)}
                    className={`p-2 rounded border transition-colors ${
                      metodo === opcao.id
                        ? "bg-primary-dynamic border-primary-dynamic text-white"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <span className="text-sm font-medium">{opcao.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor do adiantamento
              </label>
              <input
                type="text"
                placeholder="0,00"
                value={valorAdiantamento}
                onChange={(e) => setValorAdiantamento(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dynamic"
              />
              <p className="text-xs text-gray-500 mt-1">
                Máximo: {formatCurrency(saldoDevedor)}
              </p>
            </div>

            <button
              onClick={handleAddAdvance}
              disabled={adiantamentoInvalido || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-dynamic text-white rounded disabled:bg-gray-300 cursor-pointer font-semibold"
            >
              <AddPlus className="h-4 w-4" />
              {loading ? "Registrando..." : "Registrar adiantamento"}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </BaseModalWithHeader>
  );
};

export default AdvancePaymentModal;
